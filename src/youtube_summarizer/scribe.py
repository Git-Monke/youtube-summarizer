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
from .jobs import get_job


model = WhisperModel(
    DEFAULT_TRANS_MODEL,
    device=DEFAULT_TRANS_DEVICE,
    compute_type=DEFAULT_TRANS_COMPUTE_TYPE,
)


async def transcribe_audio(video_id: str):
    """Transcribe audio file to text and save segments to database."""
    job = get_job(video_id)

    q = Query()
    doc = videos.get(q.video_id == video_id)

    if doc and doc.get("status") == "done":
        logger.info(f"{video_id} has already been transcribed. Skipping operation")
        await job.update_status("transcribed", "Video already transcribed")
        return

    logger.info(f"Starting transcription for {video_id}")

    # Update job status to transcribing
    await job.update_status("transcribing", "Starting audio transcription")

    path = get_file_path(video_id) + ".mp3"
    complete_text = ""

    segments, _ = model.transcribe(path)
    start = time.time()

    # Process each segment and broadcast to clients
    for segment in segments:
        segment_text = segment.text.strip()
        logger.info(f"[{segment.start}] - [{segment.end}]: {segment_text}")

        # Add to transcript buffer and broadcast segment
        await job.broadcast_data(
            "transcript_segment",
            {
                "start": segment.start,
                "end": segment.end,
                "text": segment_text,
            },
            state_updates={"transcript_buffer": job.job_state["transcript_buffer"] + segment_text + " "}
        )

        complete_text += segment_text

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

    # Update job status to transcribed
    await job.update_status("transcribed", "Audio transcription completed")

    logger.info(f"Transcribed {video_id} successfully in {end - start}s")