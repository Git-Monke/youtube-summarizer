set -e

caddy run --config frontend/Caddyfile &
cd backend 
poetry run python -m youtube_summarizer &

wait
