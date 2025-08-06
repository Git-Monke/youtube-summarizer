from pathlib import Path

BASE_DIR = Path(__file__).parent.parent.parent.resolve()

CONTENT_DIR = BASE_DIR / "content"
STATIC_DIR = BASE_DIR / "static"

# These are used in many places, so it's better to just calculate the values once in config and then import
TRANS_DIR = CONTENT_DIR / "transcriptions"
DOWNLOAD_DIR = CONTENT_DIR / "downloads"
SUMMARIES_DIR = CONTENT_DIR / "summaries"
DB_DIR = CONTENT_DIR / "db.json"

# Config for the transcription model used
DEFAULT_TRANS_MODEL = "small.en"
DEFAULT_TRANS_DEVICE = "cpu"
DEFAULT_TRANS_COMPUTE_TYPE = "int8"

# Config for the LLM used
MAX_TOKENS = 32_000
DEFAULT_OLLAMA_MODEL = "qwen3:4b"
