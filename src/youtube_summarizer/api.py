from .download import download_video_audio
from .scribe import transcribe_audio
from .summarize import summarize_transcript
from .jobs import get_job, create_job

from .utils import extract_url_id

from fastapi import FastAPI, Request
import asyncio
import json

from starlette.responses import StreamingResponse


app = FastAPI()


@app.post("/api/summarize")
async def summarize_video_endpoint(request: Request):
    """Download, transcribe, and summarize a YouTube video."""
    data = await request.json()
    url = data["url"]

    # Extract video ID from URL
    video_id = extract_url_id(url)
    if not video_id:
        return {"error": "Invalid YouTube URL"}

    job = create_job(video_id)
    asyncio.create_task(summarize_video(video_id))


@app.get("/api/summarize/{video_id}/subscribe")
async def keep_client_updated(video_id: str):
    job = get_job(video_id)

    if not job:
        return {"error": "No job for this video id"}

    client_id, q = job.add_client()

    async def event_stream():
        yield f"data: {job.get_state()}\n\n"

        while True:
            try:
                data = await q.get()
                yield f"event: update\ndata: {json.dumps(data)}\n\n"
            except asyncio.CancelledError:
                job.remove_client(client_id)
                raise

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def summarize_video(video_id: str):
    job = get_job(video_id)

    try:
        # Download the video audio
        download_video_audio(video_id)

        # Transcribe the audio
        transcribe_audio(video_id)

        # Summarize
        summarize_transcript(video_id)

        job["state"] = "success"
        job.broadcast(
            {
                "type": "status_update",
                "data": "Video has been summarized successfully",
            }
        )
    except Exception as e:
        job["state"] = "error"
        job.broadcast({"type": "error", "data": str(e)})
