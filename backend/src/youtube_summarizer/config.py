import os
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent.parent.resolve()

CONTENT_DIR = BASE_DIR / "content"
STATIC_DIR = BASE_DIR / "static"

# These are used in many places, so it's better to just calculate the values once in config and then import
TRANS_DIR = CONTENT_DIR / "transcriptions"
DOWNLOAD_DIR = CONTENT_DIR / "downloads"
SUMMARIES_DIR = CONTENT_DIR / "summaries"
CHAT_DIR = CONTENT_DIR / "chats"
DB_DIR = CONTENT_DIR / "db.json"

# Import configuration manager for dynamic config
from .config_manager import config_manager

# Function to get current configuration values
def get_config_value(key: str):
    """Get configuration value from config manager."""
    return config_manager._config.get(key)

# Config for the transcription model used
DEFAULT_TRANS_MODEL = get_config_value("WHISPER_MODEL")
DEFAULT_TRANS_DEVICE = get_config_value("WHISPER_DEVICE")
DEFAULT_TRANS_COMPUTE_TYPE = get_config_value("WHISPER_COMPUTE_TYPE")

# Config for LLM provider
LLM_PROVIDER = get_config_value("LLM_PROVIDER")
# Max chunk size for transcript splitting - should be half of the model's max context window
MAX_CHUNK_SIZE = get_config_value("MAX_CHUNK_SIZE")

# Ollama configuration
DEFAULT_OLLAMA_MODEL = get_config_value("OLLAMA_MODEL")
OLLAMA_BASE_URL = get_config_value("OLLAMA_BASE_URL")

# OpenRouter configuration
OPENROUTER_API_KEY = get_config_value("OPENROUTER_API_KEY")
OPENROUTER_MODEL = get_config_value("OPENROUTER_MODEL")
OPENROUTER_BASE_URL = get_config_value("OPENROUTER_BASE_URL")
OPENROUTER_APP_NAME = get_config_value("OPENROUTER_APP_NAME")
OPENROUTER_SITE_URL = get_config_value("OPENROUTER_SITE_URL")
