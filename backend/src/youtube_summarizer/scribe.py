from faster_whisper import WhisperModel
from tinydb import Query
import time
import os
import json
import threading
import asyncio
import ctranslate2
from queue import Queue, Empty

from .config import (
    DEFAULT_TRANS_COMPUTE_TYPE,
    DEFAULT_TRANS_MODEL,
    TRANS_DIR,
)

from .logs import logger

from .utils import get_file_path
from .database import videos
from .summaryjobs import get_job

# Use cuda by default, cpu otherwise
device = "cuda" if ctranslate2.get_cuda_device_count() > 0 else "cpu"
print(f"For transcriptionm, using {device}")

model = WhisperModel(
    DEFAULT_TRANS_MODEL,
    device=device,
    compute_type="float32"
)


async def transcribe_audio(video_id: str):
    """Transcribe audio file to text and save segments to database."""
    job = get_job(video_id)

    if not job:
        raise ValueError("Invalid job id")

    # Create queue and start worker thread
    queue = Queue()
    t = threading.Thread(target=transcribe_worker, args=(queue, video_id), daemon=True)
    t.start()

    # Process messages from worker thread
    while t.is_alive():
        try:
            data = queue.get_nowait()
            if data["type"] == "status_update":
                await job.update_status(data["status"], data["message"])
            elif data["type"] == "transcript_segment":
                segment_data = data["data"]
                # Add to transcript buffer and broadcast segment
                await job.broadcast_data(
                    "transcript_segment",
                    segment_data,
                    state_updates={"transcript_buffer": job.job_state["transcript_buffer"] + [segment_data]}
                )
            elif data["type"] == "error":
                logger.error(f"Transcription error: {data['message']}")
                await job.update_status("error", data["message"])
                break
        except Empty:
            pass
        finally:
            await asyncio.sleep(0.01)

    # Update job status to transcribed on completion
    await job.update_status("transcribed", "Audio transcription completed")


def transcribe_worker(queue, video_id):
    """Worker function that runs in separate thread to do heavy transcription compute."""
    try:
        q = Query()
        doc = videos.get(q.video_id == video_id)

        if doc and doc.get("status") == "done":
            logger.info(f"{video_id} has already been transcribed. Skipping operation")
            queue.put({
                "type": "status_update",
                "status": "transcribed",
                "message": "Video already transcribed"
            })
            return

        logger.info(f"Starting transcription for {video_id}")

        queue.put({
            "type": "status_update", 
            "status": "transcribing",
            "message": "Starting audio transcription"
        })

        path = get_file_path(video_id) + ".mp3"
        complete_text = ""
        segments_data = []

        segments, _ = model.transcribe(path)
        start = time.time()

        # Process each segment and send to queue
        for segment in segments:
            segment_text = segment.text.strip()
            logger.info(f"[{segment.start}] - [{segment.end}]: {segment_text}")

            segment_data = {
                "start": segment.start,
                "end": segment.end,
                "text": segment_text,
            }

            segments_data.append(segment_data)

            # Send segment to main thread via queue
            queue.put({
                "type": "transcript_segment",
                "data": segment_data
            })

            complete_text += segment_text

        # Write the timestamped transcription to a JSON file
        json_filepath = f"{TRANS_DIR}/{video_id}.json"
        os.makedirs(os.path.dirname(json_filepath), exist_ok=True)
        with open(json_filepath, "w") as f:
            json.dump(segments_data, f, indent=2)

        # Update metadata to reflect completed operation
        end = time.time()

        videos.update(
            {"status": "done", "transcript_filepath": json_filepath},
            q.video_id == video_id,
        )

        queue.put({
            "type": "status_update",
            "status": "transcribed", 
            "message": "Audio transcription completed"
        })

        logger.info(f"Transcribed {video_id} successfully in {end - start}s")

    except Exception as e:
        logger.error(f"Error in transcription worker: {str(e)}")
        queue.put({
            "type": "error",
            "message": f"Transcription failed: {str(e)}"
        })
