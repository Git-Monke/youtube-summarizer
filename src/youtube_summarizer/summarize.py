from .config import MAX_TOKENS, TRANS_DIR, SUMMARIES_DIR, DEFAULT_OLLAMA_MODEL
from .logs import logger
from .utils import safe_open_write
from .jobs import get_job

from ollama import chat, ChatResponse
import time
import re
import asyncio

from langchain.text_splitter import RecursiveCharacterTextSplitter


system_prompt = """
You are a summarization assistant for long video transcripts that have been divided into multiple chunks. Your job is to produce structured, easy-to-parse summaries that can later be concatenated into a single cohesive summary.

Instructions:
- Summarize only factual content, including:
  - Actions taken
  - Decisions made
  - Definitions or key concepts introduced
  - Results, outcomes, or progress updates
- Output in chronological order
- Use bullet points
- Keep each point concise and self-contained
- Do not include: introductions, conclusions, opinions, transitions, or redundant phrasing
- The summary must be standalone and compatible with others when combined

Your output should be a clean, information-dense bullet list using markdown summarizing just this chunk.
"""


async def summarize_transcript(video_id):
    job = get_job(video_id)
    logger.info(f"Beggining summary of ${video_id}")

    # Update job status to summarizing
    await job.update_status("summarizing", "Starting video summarization")

    with open(f"{TRANS_DIR}/{video_id}.txt", "r") as f:
        full_transcript = f.read()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=MAX_TOKENS / 2, chunk_overlap=10
    )

    summary_path = SUMMARIES_DIR / f"{video_id}.md"
    chunks = splitter.split_text(full_transcript)

    logger.info(f"Found {len(chunks)} chunks.")

    with safe_open_write(summary_path) as f:
        for i, chunk in enumerate(chunks):
            chunk_summary = ""
            start = time.perf_counter()
            logger.info(f"Starting chunk {i}")

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

                # Add to summary buffer and broadcast each word/token
                await job.broadcast_data(
                    "summary_chunk",
                    {"content": word_content, "chunk": i},
                    state_updates={
                        "summary_buffer": job.job_state["summary_buffer"] + word_content
                    },
                    sleep_duration=0.001,  # Yield control frequently for streaming
                )

            # If this is a thinking model, do not include the thoughts in the summary...
            chunk_summary = re.sub(
                r"<think>.*?</think>", "", chunk_summary, flags=re.DOTALL
            ).strip()

            f.write(chunk_summary)
            end = time.perf_counter()
            logger.info(f"[Chunk {i}] finished in {end - start:.2f}s")

    # Update job status to summarized
    await job.update_status("summarized", "Video summarization completed")
