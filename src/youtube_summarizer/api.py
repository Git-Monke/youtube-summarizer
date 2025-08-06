from .download import download_video_audio
from .scribe import transcribe_audio
from .summarize import summarize_transcript
from .jobs import get_job, create_job, close_job

from .utils import extract_url_id

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json

from starlette.responses import StreamingResponse


app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

    return {"success": True, "video_id": video_id, "message": "Processing started"}


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

                if data == "close":
                    yield 'event: close\ndata: {"message": "Stream closed by server"}\n\n'
                    break

                yield f"event: update\ndata: {json.dumps(data)}\n\n"
            except asyncio.CancelledError:
                job.remove_client(client_id)
                raise

    return StreamingResponse(event_stream(), media_type="text/event-stream")


async def summarize_video(video_id: str):
    job = get_job(video_id)

    try:
        # Download the video audio
        await download_video_audio(video_id)

        # Transcribe the audio
        await transcribe_audio(video_id)

        # Summarize
        await summarize_transcript(video_id)

        await job.update_status("success", "Video has been summarized successfully")
    except Exception as e:
        await job.broadcast_data(
            "error", {"error": str(e)}, state_updates={"status": "error"}
        )

    await close_job(video_id)
