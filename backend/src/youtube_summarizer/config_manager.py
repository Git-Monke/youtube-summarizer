import json
import os
from pathlib import Path
from typing import Dict, Any, Optional
from .logs import logger

# Configuration file path
CONFIG_FILE = Path(__file__).parent.parent.parent / "content" / "server_config.json"

# Default configuration values (using uppercase keys to match env vars)
DEFAULT_CONFIG = {
    "LLM_PROVIDER": "openrouter",
    "MAX_CHUNK_SIZE": 32000,
    "WHISPER_MODEL": "small.en",
    "WHISPER_COMPUTE_TYPE": "int8",
    "OLLAMA_MODEL": "",
    "OLLAMA_BASE_URL": "",
    "OPENROUTER_MODEL": "qwen/qwen-3-7b-instruct",
    "OPENROUTER_BASE_URL": "https://openrouter.ai/api/v1",
    "OPENROUTER_APP_NAME": "YouTube Summarizer",
    "OPENROUTER_SITE_URL": "https://localhost:3000",
    "OPENROUTER_API_KEY": ""
}

# Sensitive keys that should be masked in responses
SENSITIVE_KEYS = {"OPENROUTER_API_KEY"}


class ConfigManager:
    def __init__(self):
        self._config = {}
        self.load_config()

    def load_config(self) -> None:
        """Load configuration from file and environment variables."""
        # Start with defaults
        self._config = DEFAULT_CONFIG.copy()
        
        # Load from file if it exists
        if CONFIG_FILE.exists():
            try:
                with open(CONFIG_FILE, 'r') as f:
                    file_config = json.load(f)
                    self._config.update(file_config)
                    logger.info(f"Loaded configuration from {CONFIG_FILE}")
            except (json.JSONDecodeError, IOError) as e:
                logger.error(f"Failed to load config file: {e}")
        
        # Override with environment variables (they take precedence)
        for key in DEFAULT_CONFIG.keys():
            env_value = os.getenv(key)
            if env_value is not None:
                # Convert numeric values
                if key == "MAX_CHUNK_SIZE":
                    try:
                        self._config[key] = int(env_value)
                    except ValueError:
                        logger.warning(f"Invalid numeric value for {key}: {env_value}")
                else:
                    self._config[key] = env_value.lower() if key == "LLM_PROVIDER" else env_value

        # Update environment variables to match loaded config
        self.update_environment_variables()

    def save_config(self) -> None:
        """Save configuration to file."""
        try:
            # Ensure content directory exists
            CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
            
            with open(CONFIG_FILE, 'w') as f:
                json.dump(self._config, f, indent=2)
                logger.info(f"Configuration saved to {CONFIG_FILE}")
        except IOError as e:
            logger.error(f"Failed to save config file: {e}")
            raise

    def get_config(self, mask_sensitive: bool = True) -> Dict[str, Any]:
        """Get current configuration, optionally masking sensitive values."""
        config = self._config.copy()
        
        if mask_sensitive:
            for key in SENSITIVE_KEYS:
                if key in config and config[key]:
                    # Show first 3 and last 3 characters for API keys
                    value = str(config[key])
                    if len(value) > 6:
                        config[key] = f"{value[:3]}...{value[-3:]}"
                    else:
                        config[key] = "***"
        
        return config

    def update_config(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Update configuration with new values."""
        # Validate updates
        for key, value in updates.items():
            if key not in DEFAULT_CONFIG:
                raise ValueError(f"Unknown configuration key: {key}")
            
            # Type validation
            if key == "MAX_CHUNK_SIZE":
                try:
                    updates[key] = int(value)
                except (ValueError, TypeError):
                    raise ValueError(f"Invalid numeric value for {key}: {value}")
            
            elif key == "LLM_PROVIDER":
                if value not in ["ollama", "openrouter"]:
                    raise ValueError(f"Invalid LLM provider: {value}")
                updates[key] = value.lower()
            
            elif key == "WHISPER_DEVICE":
                if value not in ["cpu", "cuda"]:
                    raise ValueError(f"Invalid Whisper device: {value}")

        # Update configuration
        self._config.update(updates)
        
        # Update environment variables
        self.update_environment_variables()
        
        # Save to file
        self.save_config()
        
        return self.get_config()

    def update_environment_variables(self) -> None:
        """Update environment variables to match current configuration."""
        for key, value in self._config.items():
            if value is not None:
                os.environ[key] = str(value)

    def test_connection(self, provider: Optional[str] = None) -> Dict[str, Any]:
        """Test connection to the specified provider."""
        test_provider = provider or self._config["LLM_PROVIDER"]
        result = {"provider": test_provider, "success": False, "error": None}
        
        try:
            if test_provider == "ollama":
                # Test Ollama connection
                import requests
                response = requests.get(f"{self._config['OLLAMA_BASE_URL']}/api/tags", timeout=5)
                if response.status_code == 200:
                    models = response.json().get("models", [])
                    model_names = [model["name"] for model in models]
                    if self._config["OLLAMA_MODEL"] in model_names:
                        result["success"] = True
                        result["message"] = f"Connected to Ollama. Model '{self._config['OLLAMA_MODEL']}' is available."
                    else:
                        result["error"] = f"Model '{self._config['OLLAMA_MODEL']}' not found. Available models: {model_names}"
                else:
                    result["error"] = f"Ollama server responded with status {response.status_code}"
                    
            elif test_provider == "openrouter":
                # Test OpenRouter connection
                if not self._config["OPENROUTER_API_KEY"]:
                    result["error"] = "OpenRouter API key is required"
                else:
                    from openai import OpenAI
                    client = OpenAI(
                        api_key=self._config["OPENROUTER_API_KEY"],
                        base_url=self._config["OPENROUTER_BASE_URL"]
                    )
                    
                    # Test with a simple completion
                    response = client.chat.completions.create(
                        model=self._config["OPENROUTER_MODEL"],
                        messages=[{"role": "user", "content": "test"}],
                        max_tokens=1,
                        extra_headers={
                            "HTTP-Referer": self._config["OPENROUTER_SITE_URL"],
                            "X-Title": self._config["OPENROUTER_APP_NAME"],
                        }
                    )
                    
                    if response.choices:
                        result["success"] = True
                        result["message"] = f"Connected to OpenRouter. Model '{self._config['OPENROUTER_MODEL']}' is available."
                    else:
                        result["error"] = "OpenRouter responded but no completion received"
            else:
                result["error"] = f"Unknown provider: {test_provider}"
                
        except Exception as e:
            result["error"] = str(e)
        
        return result


# Global configuration manager instance
config_manager = ConfigManager()
