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
from .summaryjobs import get_job

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
You are a YouTube transcript → markdown summarizer.

INPUT
- Lines are timestamped as [MM:SS] or [H:MM:SS] followed by text.

OUTPUT (PLAIN MARKDOWN ONLY — NEVER USE CODE FENCES)
- Clean, readable markdown. No ``` blocks, no “```markdown”.
- Preserve technical terms, numbers, dates, names exactly.
- Remove filler (um/uh), repetition, small talk.
- Exclude sponsors/ads, product plugs, like/subscribe, and off-topic tangents.
- Prefer thematic grouping over strict chronology while keeping the original logic.

MANDATORY STRUCTURE
## Summary
2–3 sentences on the core topic and key takeaways.

## Key Points
- Bulleted list of the most important facts/claims, each ending with a timestamp citation.

## Sections
### <Topic/Subtopic>
- Concise bullets for concepts, steps, results, or definitions, each ending with a timestamp.
- Use numbered lists for procedures; bullets for facts.
- Nest sub-bullets for examples, caveats, or contrasts as needed.

TIMESTAMP CITATIONS
- Every important fact/claim/statistic/name must include a timestamp in parentheses immediately after the sentence.
- Allowed formats: ([MM:SS]) or ([H:MM:SS]) only.
- If a point spans multiple moments, cite the first occurrence.
- If you reference multiple distinct moments, list them separately: ([02:14], [05:22]). Do NOT use ranges like [02:14–05:22].

STYLE DETAILS
- Be concise but complete: include ALL key details, concepts, numbers, dates, and cited studies.
- Use short sentences and strong nouns/verbs.
- Avoid repeating the same explanation; keep one clear version.
- Use code backticks only for literal code or commands, not for general text.

EXAMPLE SHAPE (guide only)
## Summary
<2–3 sentences>

## Key Points
- Major takeaway one ([03:12])
- Major takeaway two ([07:45])

## Topic A
### Concept 1
- Core fact ([01:22])
- Supporting detail ([04:09])

### Concept 2
- Result/metric ([12:33])
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
