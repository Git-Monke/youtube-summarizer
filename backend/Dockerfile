FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install poetry

# Copy poetry files for dependency installation
COPY pyproject.toml poetry.lock README.md ./

# Configure poetry to not create virtual environment
RUN poetry config virtualenvs.create false


# Copy application code
COPY src/ ./src/

# Install dependencies
RUN poetry install --only main


# Create necessary directories for content persistence
RUN mkdir -p /app/content

# Expose port
EXPOSE 8008

# Command to run the application
CMD ["poetry", "run", "python", "-m", "youtube_summarizer"]
