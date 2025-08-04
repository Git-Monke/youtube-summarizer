import yt_dlp
import os
from tinydb import Query

from .utils import get_file_path
from .database import videos
from .logs import logger


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
    path = get_file_path(video_id)

    ydl_opts = {
        "format": "bestaudio",
        "outtmpl": f"{path}.%(ext)s",
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "192",
            }
        ],
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        url = f"https://www.youtube.com/watch?v={video_id}"

        q = Query()
        doc = videos.get(q.video_id == video_id)

        if not doc:
            # Extract info and save metadata
            info = ydl.extract_info(url, download=False)
            new_entry = info_to_metadata(info)
            videos.insert(new_entry)
        else:
            logger.info(
                f"{video_id} metadata already exists. Skipping meta-fetch operation."
            )

        if os.path.exists(path + ".mp3"):
            logger.info(f"{video_id}.mp3 already exists, skipping download operation")
            return

        # Download the audio
        ydl.download([url])
