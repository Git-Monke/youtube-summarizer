import re
from .config import DOWNLOAD_DIR
from pathlib import Path

def get_file_path(video_id: str):
    """Returns the file path for the audio file of a YouTube video."""

    return f"{DOWNLOAD_DIR}/{video_id}"

def extract_url_id(video_url: str):
    """Extracts the video ID from a YouTube URL."""
    patterns = [
        r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})',
        r'youtube\.com/v/([a-zA-Z0-9_-]{11})',
        r'youtube\.com/shorts/([a-zA-Z0-9_-]{11})'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, video_url)
        if match:
            return match.group(1)
    
    return None

# Opens a file in write mode, creating all parent dirs in the path if they don't exist
# Prevents errors if the necessary path hasn't been initialized yet
def safe_open_write(path: str, mode="w", **kwargs):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    return open(path, mode, **kwargs)
