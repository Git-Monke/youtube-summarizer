from tinydb import TinyDB
from .config import DB_DIR

db = TinyDB(DB_DIR)

# Stores metadata about videos
videos = db.table("videos")

# Stores job transcripts
jobs = db.table("jobs")
