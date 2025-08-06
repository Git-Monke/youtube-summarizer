import yt_dlp
import os
from tinydb import Query

from .utils import get_file_path
from .database import videos
from .logs import logger
from .jobs import get_job

from queue import Queue, Empty
import threading
import asyncio
import re


def info_to_metadata(info):
    return {
        "title": info.get("title"),
        "duration": info.get("duration"),
        "uploader": info.get("uploader"),
        "upload_date": info.get("upload_date"),
        "thumbnail_url": info.get("thumbnail"),
        "webpage_url": info.get("webpage_url"),
        "video_id": info.get("id"),
    }


async def download_video_audio(video_id: str):
    """Download audio from a YouTube video."""

    # Get job info and filepath
    job = get_job(video_id)

    # Update job status to preparing
    await job.update_status("preparing", "Preparing download")

    queue = Queue()
    t = threading.Thread(target=youtube_dl, args=(queue, video_id), daemon=True)
    t.start()

    while t.is_alive():
        try:
            data = queue.get_nowait()
            if data["type"] == "status_update":
                await job.update_status(data["status"], data["message"])
            elif data["type"] == "download_progress":
                await job.broadcast_data(
                    "download_progress",
                    {"progress": data["progress"], "message": data["message"]},
                )
        except Empty:
            pass
        finally:
            await asyncio.sleep(0.01)

    # Update job status to downloaded on completion
    await job.update_status("downloaded", "Video download completed")


def youtube_dl(queue, video_id):
    # Check if the file exists, no need to download if it does just send a download complete message
    path = get_file_path(video_id)
    q = Query()
    doc = videos.get(q.video_id == video_id)
    url = f"https://www.youtube.com/watch?v={video_id}"

    def yt_dlp_hook(d):
        if d["status"] == "downloading":
            raw_percent = d.get("_percent_str", "0%")
            # First remove ANSI escape codes, then extract percentage
            ansi_cleaned = re.sub(r"\x1b\[[0-9;]*m", "", raw_percent)
            # Extract just the number part before the %
            percent_match = re.search(r"(\d+\.?\d*)%?", ansi_cleaned.strip())

            if percent_match:
                try:
                    percent = float(percent_match.group(1))
                    queue.put(
                        {
                            "type": "download_progress",
                            "progress": percent,
                            "message": f"Downloaded {ansi_cleaned.strip()}",
                        }
                    )
                except (ValueError, AttributeError):
                    pass
        elif d["status"] == "finished":
            queue.put(
                {
                    "type": "status_update",
                    "status": "converting",
                    "message": "Converting video to audio",
                }
            )

    # Set up initial ops
    opts = {
        "format": "bestaudio",
        "outtmpl": f"{path}.%(ext)s",
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }
        ],
        "progress_hooks": [yt_dlp_hook],
    }

    if not (os.path.exists(path + ".mp3") and doc):
        with yt_dlp.YoutubeDL(opts) as ydl:
            # If the doc doesn't exist, get the metadata and add an entry for it
            if not doc:
                queue.put(
                    {
                        "type": "status_update",
                        "status": "extracting_metadata",
                        "message": "Extracting video metadata",
                    }
                )
                info = ydl.extract_info(url, download=False)
                new_entry = info_to_metadata(info)
                videos.insert(new_entry)

            # If the file doesn't exist, download it
            if not os.path.exists(path + ".mp3"):
                queue.put(
                    {
                        "type": "status_update",
                        "status": "downloading",
                        "message": "Downloading video",
                    }
                )
                ydl.download([url])
