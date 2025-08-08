import os
import json
import asyncio
from typing import List, Dict, Any

from .config import (
    CHAT_DIR, 
    TRANS_DIR,
    LLM_PROVIDER,
    DEFAULT_OLLAMA_MODEL,
    OLLAMA_BASE_URL,
    OPENROUTER_API_KEY,
    OPENROUTER_MODEL,
    OPENROUTER_BASE_URL,
    OPENROUTER_APP_NAME,
    OPENROUTER_SITE_URL,
)
from .logs import logger
from .chatjobs import get_chat_job


def get_chat_file_path(video_id: str) -> str:
    """Get the file path for a video's chat history."""
    return os.path.join(CHAT_DIR, f"{video_id}_chat.json")


def load_chat_history(video_id: str) -> List[Dict[str, str]]:
    """Load chat history for a video."""
    # Ensure chat directory exists
    os.makedirs(CHAT_DIR, exist_ok=True)
    
    chat_file = get_chat_file_path(video_id)
    if os.path.exists(chat_file):
        try:
            with open(chat_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            logger.warning(f"Failed to load chat history for {video_id}, starting fresh")
    
    return []


def save_chat_history(video_id: str, messages: List[Dict[str, str]]):
    """Save chat history for a video."""
    os.makedirs(CHAT_DIR, exist_ok=True)
    chat_file = get_chat_file_path(video_id)
    
    try:
        with open(chat_file, 'w', encoding='utf-8') as f:
            json.dump(messages, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"Failed to save chat history for {video_id}: {e}")


def load_video_transcript(video_id: str) -> str:
    """Load the video transcript to use as context."""
    transcript_file = os.path.join(TRANS_DIR, f"{video_id}.json")
    
    if not os.path.exists(transcript_file):
        return ""
    
    try:
        with open(transcript_file, 'r', encoding='utf-8') as f:
            transcript_data = json.load(f)
            # Combine all transcript segments into one text
            return " ".join([segment['text'] for segment in transcript_data])
    except Exception as e:
        logger.error(f"Failed to load transcript for {video_id}: {e}")
        return ""


async def ask_question(video_id: str, question: str) -> str:
    """Ask a question about the video and stream the response."""
    # Load chat history and transcript
    chat_history = load_chat_history(video_id)
    transcript = load_video_transcript(video_id)
    
    # Create context for the LLM
    context_prompt = f"""You are a helpful assistant that answers questions about YouTube videos based on their transcripts. 

Video Transcript:
{transcript}

Please answer the user's question based on the information in the transcript. If the transcript doesn't contain relevant information, say so politely.

Chat History:
"""
    
    # Add chat history to context
    messages = [{"role": "system", "content": context_prompt}]
    for msg in chat_history:
        messages.append(msg)
    
    # Add the new user question
    messages.append({"role": "user", "content": question})
    
    # Get the chat job for streaming
    chat_job = get_chat_job(video_id)
    if not chat_job:
        raise Exception("Chat job not found")
    
    await chat_job.start_response()
    
    try:
        # Stream the response based on provider
        if LLM_PROVIDER == "ollama":
            response = await _stream_ollama_response(messages, chat_job)
        elif LLM_PROVIDER == "openrouter":
            response = await _stream_openrouter_response(messages, chat_job)
        else:
            raise Exception(f"Unsupported LLM provider: {LLM_PROVIDER}")
        
        # Save to chat history
        chat_history.append({"role": "user", "content": question})
        chat_history.append({"role": "assistant", "content": response})
        save_chat_history(video_id, chat_history)
        
        await chat_job.finish_response()
        return response
        
    except Exception as e:
        logger.error(f"Failed to get chat response: {e}")
        await chat_job.broadcast_error(str(e))
        raise


async def _stream_ollama_response(messages: List[Dict[str, str]], chat_job) -> str:
    """Stream response from Ollama."""
    from ollama import chat
    
    # Convert messages to Ollama format
    ollama_messages = []
    for msg in messages:
        ollama_messages.append({
            "role": msg["role"],
            "content": msg["content"]
        })
    
    full_response = ""
    
    try:
        stream = chat(
            model=DEFAULT_OLLAMA_MODEL,
            messages=ollama_messages,
            stream=True,
            options={"temperature": 0.7}
        )
        
        for chunk in stream:
            if 'message' in chunk and 'content' in chunk['message']:
                token = chunk['message']['content']
                full_response += token
                await chat_job.broadcast_data(token)
        
        return full_response
    
    except Exception as e:
        logger.error(f"Ollama streaming error: {e}")
        raise


async def _stream_openrouter_response(messages: List[Dict[str, str]], chat_job) -> str:
    """Stream response from OpenRouter."""
    from openai import OpenAI
    
    client = OpenAI(
        base_url=OPENROUTER_BASE_URL,
        api_key=OPENROUTER_API_KEY,
        default_headers={
            "HTTP-Referer": OPENROUTER_SITE_URL,
            "X-Title": OPENROUTER_APP_NAME,
        }
    )
    
    full_response = ""
    
    try:
        stream = client.chat.completions.create(
            model=OPENROUTER_MODEL,
            messages=messages,
            stream=True,
            temperature=0.7,
        )
        
        for chunk in stream:
            if chunk.choices[0].delta.content:
                token = chunk.choices[0].delta.content
                full_response += token
                await chat_job.broadcast_data(token)
        
        return full_response
    
    except Exception as e:
        logger.error(f"OpenRouter streaming error: {e}")
        raise