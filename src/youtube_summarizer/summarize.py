from .config import MAX_TOKENS, TRANS_DIR, SUMMARIES_DIR, DEFAULT_OLLAMA_MODEL
from .logs import logger
from .utils import safe_open_write

from ollama import chat, ChatResponse
import time
import re

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

Your output should be a clean, information-dense bullet list summarizing just this chunk.
"""


async def summarize_transcript(video_id):
    logger.info(f"Beggining summary of ${video_id}")

    with open(f"{TRANS_DIR}/{video_id}.txt", "r") as f:
        full_transcript = f.read()

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=MAX_TOKENS / 2, chunk_overlap=10
    )

    summary_path = SUMMARIES_DIR / f"{video_id}.txt"
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
                chunk_summary += word["message"]["content"]

            # If this is a thinking model, do not include the thoughts in the summary...
            chunk_summary = re.sub(
                r"<think>.*?</think>", "", chunk_summary, flags=re.DOTALL
            ).strip()

            f.write(chunk_summary)
            end = time.perf_counter()
            logger.info(f"[Chunk {i}] finished in {end - start:.2f}s")
