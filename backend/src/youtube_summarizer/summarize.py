from .config import (
    MAX_CHUNK_SIZE,
    TRANS_DIR,
    SUMMARIES_DIR,
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
from .utils import safe_open_write
from .jobs import get_job

from ollama import chat, ChatResponse
from openai import OpenAI
import time
import re
import asyncio
import json
import threading
from queue import Queue, Empty

from langchain.text_splitter import RecursiveCharacterTextSplitter

system_prompt = """
You are a YouTube video summarizer that creates comprehensive, well-structured markdown summaries from timestamped transcripts.

## Input Format
You will receive timestamped sentences in the format:
[MM:SS] or [H:MM:SS] Transcript text here

## Output Requirements

### Content Guidelines
- Include ALL key details, facts, concepts, and important information
- Remove filler words, repetitive statements, "um", "uh", verbal stumbles, and unnecessary conversational padding
- Filter out sponsorships, advertisements, promotional content, and sponsor messages completely
- Maintain the logical flow and structure of the original content
- Preserve technical terms, specific numbers, dates, names, and citations exactly as mentioned

### Formatting Requirements
- Use clean, readable markdown with appropriate headers (##, ###, ####)
- Structure content with bullet points, numbered lists, and subheadings as needed
- Include a brief summary at the top (2-3 sentences maximum)
- Organize content thematically rather than chronologically when it improves clarity

### Timestamp Citations
- Every claim, fact, statistic, or important piece of information MUST include a timestamp citation
- Format timestamps as: `([MM:SS])` or `([H:MM:SS])`
- Place timestamps immediately after the relevant information
- For information spanning multiple timestamps, use the first occurrence
- Example: "The study found a 23% increase in efficiency ([15:42]) when using the new method."

### Content to Exclude
- Sponsor segments and advertisements
- "This video is sponsored by..." type content
- Product placements and promotional material
- Channel self-promotion (like/subscribe reminders)
- Irrelevant tangents and off-topic discussions
- Repetitive explanations of the same concept

### Structure Example
```markdown
## Summary
Brief overview of the main topic and key takeaways.

## Main Topic/Section 1
Key information with timestamps ([MM:SS])

### Subsection
- Important point ([MM:SS])
- Another key detail ([MM:SS])

## Main Topic/Section 2
Continue structuring content logically...
```

Remember: Your goal is to create a comprehensive reference document in markdown that captures all valuable information while being concise and well-organized. Every important claim should be verifiable through its timestamp.
"""


async def summarize_transcript(video_id):
    """Summarize transcript using threading pattern to avoid blocking main thread."""
    job = get_job(video_id)

    if not job:
        raise ValueError("Invalid job id")

    # Create queue and start worker thread
    queue = Queue()
    t = threading.Thread(target=summarize_worker, args=(queue, video_id), daemon=True)
    t.start()

    # Process messages from worker thread
    while t.is_alive():
        try:
            data = queue.get_nowait()
            if data["type"] == "status_update":
                await job.update_status(data["status"], data["message"])
            elif data["type"] == "summary_chunk":
                # Add to summary buffer and broadcast chunk
                await job.broadcast_data(
                    "summary_chunk",
                    data["data"],
                    state_updates={
                        "summary_buffer": job.job_state["summary_buffer"]
                        + data["data"]["content"]
                    },
                    sleep_duration=0.001,  # Yield control frequently for streaming
                )
            elif data["type"] == "error":
                logger.error(f"Summarization error: {data['message']}")
                await job.update_status("error", data["message"])
                break
        except Empty:
            pass
        finally:
            await asyncio.sleep(0.01)

    # Update job status to summarized on completion
    await job.update_status("summarized", "Video summarization completed")


def format_transcript_with_timestamps(segments):
    """Convert segments to timestamped transcript format for LLM consumption."""
    formatted_segments = []
    for segment in segments:
        # Convert seconds to MM:SS format
        minutes = int(segment["start"] // 60)
        seconds = int(segment["start"] % 60)
        timestamp = f"[{minutes:02d}:{seconds:02d}]"
        formatted_segments.append(f"{timestamp} {segment['text']}")
    return "\n".join(formatted_segments)


def summarize_worker(queue, video_id):
    """Worker function that runs in separate thread to do heavy summarization compute."""
    try:
        logger.info(f"Beginning summary of {video_id}")

        queue.put(
            {
                "type": "status_update",
                "status": "summarizing",
                "message": "Starting video summarization",
            }
        )

        with open(f"{TRANS_DIR}/{video_id}.json", "r") as f:
            segments = json.load(f)

        # Create timestamped transcript format
        full_transcript = format_transcript_with_timestamps(segments)

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=MAX_CHUNK_SIZE, chunk_overlap=10
        )

        summary_path = SUMMARIES_DIR / f"{video_id}.md"
        chunks = splitter.split_text(full_transcript)

        logger.info(f"Found {len(chunks)} chunks.")

        with safe_open_write(summary_path) as f:
            for i, chunk in enumerate(chunks):
                chunk_summary = ""
                start = time.perf_counter()
                logger.info(f"Starting chunk {i}")

                # Use appropriate LLM provider
                if LLM_PROVIDER == "openrouter":
                    # OpenRouter via OpenAI client
                    if not OPENROUTER_API_KEY:
                        raise ValueError(
                            "OPENROUTER_API_KEY is required when using openrouter provider"
                        )

                    client = OpenAI(
                        api_key=OPENROUTER_API_KEY, base_url=OPENROUTER_BASE_URL
                    )

                    stream = client.chat.completions.create(
                        model=OPENROUTER_MODEL,
                        stream=True,
                        messages=[
                            {
                                "role": "system",
                                "content": system_prompt,
                            },
                            {
                                "role": "user",
                                "content": f"Summarize the following video transcript: \n\n{chunk}",
                            },
                        ],
                        extra_headers={
                            "HTTP-Referer": OPENROUTER_SITE_URL,
                            "X-Title": OPENROUTER_APP_NAME,
                        },
                    )

                    for word in stream:
                        if word.choices[0].delta.content:
                            word_content = word.choices[0].delta.content
                            chunk_summary += word_content

                            # Send chunk data to main thread via queue
                            queue.put(
                                {
                                    "type": "summary_chunk",
                                    "data": {"content": word_content, "chunk": i},
                                }
                            )

                else:
                    # Default to Ollama
                    stream = chat(
                        model=DEFAULT_OLLAMA_MODEL,
                        stream=True,
                        messages=[
                            {
                                "role": "system",
                                "content": system_prompt,
                            },
                            {
                                "role": "user",
                                "content": f"Summarize the following video transcript: \n\n{chunk}",
                            },
                        ],
                    )

                    for word in stream:
                        word_content = word["message"]["content"]
                        chunk_summary += word_content

                        # Send chunk data to main thread via queue
                        queue.put(
                            {
                                "type": "summary_chunk",
                                "data": {"content": word_content, "chunk": i},
                            }
                        )

                # If this is a thinking model, do not include the thoughts in the summary...
                chunk_summary = re.sub(
                    r"<think>.*?</think>", "", chunk_summary, flags=re.DOTALL
                ).strip()

                f.write(chunk_summary)
                end = time.perf_counter()
                logger.info(f"[Chunk {i}] finished in {end - start:.2f}s")

        queue.put(
            {
                "type": "status_update",
                "status": "summarized",
                "message": "Video summarization completed",
            }
        )

        logger.info(f"Summarized {video_id} successfully")

    except Exception as e:
        logger.error(f"Error in summarization worker: {str(e)}")
        queue.put({"type": "error", "message": f"Summarization failed: {str(e)}"})
