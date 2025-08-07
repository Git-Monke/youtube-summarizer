from tinydb import TinyDB
from .config import DB_DIR
import os

# Ensure the directory exists before creating the database
os.makedirs(DB_DIR.parent, exist_ok=True)

db = TinyDB(DB_DIR)

# Stores metadata about videos
videos = db.table("videos")

# Stores job transcripts
jobs = db.table("jobs")
