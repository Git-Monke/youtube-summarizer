import yt_dlp
import os
from tinydb import Query

from .utils import get_file_path
from .database import videos
from .logs import logger
from .summaryjobs import get_job

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

    if not job:
        raise ValueError("Invalid video id")

    # Update job status to preparing
    await job.update_status("preparing", "Preparing download")

    queue = Queue()
    t = threading.Thread(target=youtube_dl, args=(queue, video_id), daemon=True)
    t.start()

    largest_progress = 0.0

    while t.is_alive():
        try:
            data = queue.get_nowait()
            if data["type"] == "status_update":
                await job.update_status(data["status"], data["message"])
            elif data["type"] == "download_progress":
                # This if statement is a little weird but it stops backwards progress
                if data["progress"] > largest_progress:
                    largest_progress = data["progress"]
                    await job.broadcast_data(
                        "download_progress",
                        {"progress": data["progress"], "message": data["message"]},
                        state_updates={"download_progress": data["progress"]}
                    )
            elif data["type"] == "video_metadata":
                await job.broadcast_data(
                    "video_metadata",
                    data["data"],
                    state_updates={"video": data["data"]}
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

    # Fragment progress tracking
    fragment_progress = {}  # Track progress per fragment
    total_fragments = None
    last_total_progress = 0.0

    def yt_dlp_hook(d):
        nonlocal fragment_progress, total_fragments, last_total_progress
        
        if d["status"] == "downloading":
            # Check if this is a fragmented download
            fragment_index = d.get("fragment_index")
            fragment_count = d.get("fragment_count")
            
            if fragment_index is not None and fragment_count is not None:
                # Fragmented download - use fragment-based progress
                total_fragments = fragment_count
                
                # Get current fragment progress
                fragment_percent = 0.0
                if "fragment_percent" in d:
                    fragment_percent = d["fragment_percent"]
                elif "_percent_str" in d:
                    # Parse fragment percent from string
                    raw_percent = d.get("_percent_str", "0%")
                    ansi_cleaned = re.sub(r"\x1b\[[0-9;]*m", "", raw_percent)
                    percent_match = re.search(r"(\d+\.?\d*)%?", ansi_cleaned.strip())
                    if percent_match:
                        try:
                            fragment_percent = float(percent_match.group(1))
                        except (ValueError, AttributeError):
                            fragment_percent = 0.0
                
                # Update fragment progress tracking
                fragment_progress[fragment_index] = fragment_percent
                
                # Calculate total progress: (completed fragments * 100 + current fragment progress) / total fragments
                completed_fragments = sum(1 for fp in fragment_progress.values() if fp >= 100.0)
                current_fragment_progress = fragment_percent if fragment_index in fragment_progress else 0.0
                
                # If current fragment isn't complete, add its progress
                if fragment_percent < 100.0:
                    total_progress = (completed_fragments * 100.0 + current_fragment_progress) / total_fragments
                else:
                    total_progress = (completed_fragments * 100.0) / total_fragments
                
                # Ensure progress doesn't go backwards and is reasonable
                total_progress = max(last_total_progress, min(100.0, total_progress))
                
                if total_progress > last_total_progress:
                    last_total_progress = total_progress
                    queue.put({
                        "type": "download_progress",
                        "progress": total_progress,
                        "message": f"Downloaded fragment {fragment_index}/{fragment_count} ({total_progress:.1f}%)"
                    })
                    
            else:
                # Non-fragmented download - use existing logic
                raw_percent = d.get("_percent_str", "0%")
                ansi_cleaned = re.sub(r"\x1b\[[0-9;]*m", "", raw_percent)
                percent_match = re.search(r"(\d+\.?\d*)%?", ansi_cleaned.strip())

                if percent_match:
                    try:
                        percent = float(percent_match.group(1))
                        if percent > last_total_progress:
                            last_total_progress = percent
                            queue.put({
                                "type": "download_progress",
                                "progress": percent,
                                "message": f"Downloaded {ansi_cleaned.strip()}",
                            })
                    except (ValueError, AttributeError):
                        pass
                        
        elif d["status"] == "finished":
            # Always broadcast 100% completion regardless of fragment calculation issues
            queue.put({
                "type": "download_progress", 
                "progress": 100.0,
                "message": "Download completed (100%)"
            })
            queue.put({
                "type": "status_update",
                "status": "converting",
                "message": "Converting video to audio",
            })

    # Set up initial ops
    opts = {
        "format": "bestaudio/best",
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
                
                # Broadcast video metadata to frontend via SSE
                queue.put({
                    "type": "video_metadata",
                    "data": new_entry
                })

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
