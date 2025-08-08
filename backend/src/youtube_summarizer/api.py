from .download import download_video_audio
from .scribe import transcribe_audio
from .summarize import summarize_transcript
from .summaryjobs import get_job, create_job, close_job
from .chatjobs import get_chat_job, create_chat_job, close_chat_job
from .chat import load_chat_history, ask_question

from .utils import extract_url_id

from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
import os
import sys
from tinydb import Query
from fastapi.staticfiles import StaticFiles

from starlette.responses import StreamingResponse

from .database import videos
from .config import SUMMARIES_DIR, TRANS_DIR, DOWNLOAD_DIR
from .config_manager import config_manager


# Pydantic models for configuration
class ConfigUpdate(BaseModel):
    LLM_PROVIDER: str = None
    MAX_CHUNK_SIZE: int = None
    WHISPER_MODEL: str = None
    WHISPER_DEVICE: str = None
    WHISPER_COMPUTE_TYPE: str = None
    OLLAMA_MODEL: str = None
    OLLAMA_BASE_URL: str = None
    OPENROUTER_MODEL: str = None
    OPENROUTER_BASE_URL: str = None
    OPENROUTER_APP_NAME: str = None
    OPENROUTER_SITE_URL: str = None
    OPENROUTER_API_KEY: str = None

    class Config:
        extra = "forbid"  # Don't allow extra fields


app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/summary/{video_id}/status")
async def get_summary_status(video_id: str):
    job = get_job(video_id)

    if job:
        return {
            "status": "in_progress",
            "state": job.get_state()
        }
    
    # Check if summary file exists
    summary_filepath = f"{SUMMARIES_DIR}/{video_id}.md"
    if os.path.exists(summary_filepath):
        q = Query()
        video_doc = videos.get(q.video_id == video_id)
        
        if video_doc:
            return {
                "status": "completed",
                "state": {
                    "video": video_doc,
                }
            }
        else:
            return {
                "status": "completed",
                "video": None
            }
    
    # Video doesn't exist or hasn't been processed
    q = Query()
    video_doc = videos.get(q.video_id == video_id)
    
    if video_doc:
        return {
            "status": "not_started",
            "video": video_doc
        }
    else:
        raise HTTPException(status_code=404, detail="Video not found")


@app.get("/api/summary/{video_id}")
async def get_summary_content(video_id: str):
    """Return summary markdown content for a video."""
    summary_filepath = f"{SUMMARIES_DIR}/{video_id}.md"
    
    if os.path.exists(summary_filepath):
        with open(summary_filepath, "r") as f:
            return {"content": f.read()}
    
    raise HTTPException(status_code=404, detail="Summary not found")






@app.get("/api/transcript/{video_id}")
async def get_transcript(video_id: str):
    """Return transcript with timestamps for a video."""
    json_filepath = f"{TRANS_DIR}/{video_id}.json"
    if os.path.exists(json_filepath):
        with open(json_filepath, "r") as f:
            return {"transcript": json.load(f)}
    
    raise HTTPException(status_code=404, detail="Transcript not found")


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


@app.get("/api/videos")
async def get_all_videos():
    """Return all videos from the database."""
    all_videos = videos.all()
    return {"videos": all_videos}


@app.get("/api/videos/{video_id}")
async def get_video_by_id(video_id: str):
    """Return specific video metadata by ID."""
    q = Query()
    video_doc = videos.get(q.video_id == video_id)
    
    if video_doc:
        return {"video": video_doc}
    else:
        raise HTTPException(status_code=404, detail="Video not found")


@app.delete("/api/videos/{video_id}")
async def delete_video(video_id: str):
    """Delete a video and all associated files."""
    q = Query()
    video_doc = videos.get(q.video_id == video_id)
    
    if not video_doc:
        raise HTTPException(status_code=404, detail="Video not found")
    
    # Delete associated files
    download_file = DOWNLOAD_DIR / f"{video_id}.mp3"
    if download_file.exists():
        try:
            download_file.unlink()
        except Exception:
            pass  # Continue even if file deletion fails
    
    transcript_file = TRANS_DIR / f"{video_id}.json"
    if transcript_file.exists():
        try:
            transcript_file.unlink()
        except Exception:
            pass
    
    summary_file = SUMMARIES_DIR / f"{video_id}.md"
    if summary_file.exists():
        try:
            summary_file.unlink()
        except Exception:
            pass
    
    # Remove from database
    videos.remove(q.video_id == video_id)
    
    return {"success": True, "message": f"Video {video_id} deleted successfully"}


async def restart_server():
    """Restart the server process after a short delay."""
    await asyncio.sleep(0.5)  # Allow response to be sent
    os.execv(sys.executable, [sys.executable] + sys.argv)


@app.get("/api/config")
async def get_config():
    """Get current server configuration."""
    try:
        config = config_manager.get_config(mask_sensitive=True)
        return {"success": True, "config": config}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get configuration: {str(e)}")


@app.put("/api/config")
async def update_config(config_update: ConfigUpdate, background_tasks: BackgroundTasks):
    """Update server configuration."""
    try:
        # Convert to dict and remove None values
        updates = {k: v for k, v in config_update.dict().items() if v is not None}
        
        if not updates:
            raise HTTPException(status_code=400, detail="No configuration updates provided")
        
        updated_config = config_manager.update_config(updates)
        
        # Schedule server restart in background to apply configuration changes
        background_tasks.add_task(restart_server)
        
        return {"success": True, "config": updated_config, "message": "Configuration saved. Server will restart to apply changes."}
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update configuration: {str(e)}")


@app.post("/api/config/test")
async def test_config_connection(request: Request):
    """Test connection with current or specified provider."""
    try:
        data = await request.json()
        provider = data.get("provider")  # Optional, defaults to current provider
        
        result = config_manager.test_connection(provider)
        return {"success": result["success"], **result}
        
    except Exception as e:
        return {"success": False, "error": f"Failed to test connection: {str(e)}"}


async def summarize_video(video_id: str):
    job = get_job(video_id)

    if not job:
        raise Exception("Tried to get a job that doesn't exist") 

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


# Chat endpoints
@app.get("/api/chat/{video_id}")
async def get_chat_history(video_id: str):
    """Get chat history for a video."""
    try:
        chat_history = load_chat_history(video_id)
        return {"messages": chat_history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load chat history: {str(e)}")


@app.post("/api/chat/{video_id}/ask")
async def ask_chat_question(video_id: str, request: Request):
    """Ask a question about a video and start streaming response."""
    try:
        data = await request.json()
        question = data.get("question", "").strip()
        
        if not question:
            raise HTTPException(status_code=400, detail="Question is required")
        
        # Create or get existing chat job
        chat_job = create_chat_job(video_id)
        
        # Start processing question in background
        asyncio.create_task(ask_question(video_id, question))
        
        return {"success": True, "message": "Question received, response streaming"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process question: {str(e)}")


@app.get("/api/chat/{video_id}/subscribe")
async def subscribe_to_chat(video_id: str):
    """Subscribe to chat responses via Server-Sent Events."""
    chat_job = get_chat_job(video_id)
    
    if not chat_job:
        # Create chat job if it doesn't exist to allow subscription
        chat_job = create_chat_job(video_id)
    
    client_id, q = chat_job.add_client()
    
    async def event_stream():
        # Send current state
        yield f"data: {chat_job.get_state()}\n\n"
        
        while True:
            try:
                data = await q.get()
                
                if data == "close":
                    yield 'event: close\ndata: {"message": "Stream closed by server"}\n\n'
                    break
                
                # Handle special control messages
                if isinstance(data, str):
                    if data == "__RESPONSE_COMPLETE__":
                        yield 'event: complete\ndata: {"type": "response_complete"}\n\n'
                        continue
                    elif data.startswith("__ERROR__:"):
                        error_msg = data.replace("__ERROR__:", "")
                        yield f'event: error\ndata: {{"error": "{error_msg}"}}\n\n'
                        continue
                
                # Regular streaming tokens
                yield f"event: token\ndata: {json.dumps(data)}\n\n"
                
            except asyncio.CancelledError:
                chat_job.remove_client(client_id)
                raise
    
    return StreamingResponse(event_stream(), media_type="text/event-stream")
