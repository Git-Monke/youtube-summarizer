from faster_whisper import WhisperModel
from tinydb import Query
import time
import os

from .config import (
    DEFAULT_TRANS_COMPUTE_TYPE,
    DEFAULT_TRANS_DEVICE,
    DEFAULT_TRANS_MODEL,
    TRANS_DIR,
)

from .logs import logger

from .utils import get_file_path
from .database import videos


model = WhisperModel(
    DEFAULT_TRANS_MODEL,
    device=DEFAULT_TRANS_DEVICE,
    compute_type=DEFAULT_TRANS_COMPUTE_TYPE,
)


async def transcribe_audio(video_id: str):
    """Transcribe audio file to text and save segments to database."""

    q = Query()
    doc = videos.get(q.video_id == video_id)

    if doc and doc.get("status") == "done":
        logger.info(f"{video_id} has already been transcribed. Skipping operation")
        return

    logger.info(f"Starting transcription for {video_id}")

    path = get_file_path(video_id) + ".mp3"
    complete_text = ""

    segments, info = model.transcribe(path)
    start = time.time()

    # Process each segment (no longer storing in database)
    for segment in segments:
        logger.info(f"[{segment.start}] - [{segment.end}]: {segment.text.strip()}")

        complete_text += segment.text.strip()

    # Write the complete transcription to a txt file for later use
    filepath = f"{TRANS_DIR}/{video_id}.txt"
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, "w") as f:
        f.write(complete_text.replace(".", ".\n"))

    # Update metadata to reflect completed operation
    end = time.time()

    videos.update(
        {"status": "done", "duration": end - start, "transcript_filepath": filepath},
        q.video_id == video_id,
    )

    logger.info(f"Transcribed {video_id} successfully in {end - start}s")
