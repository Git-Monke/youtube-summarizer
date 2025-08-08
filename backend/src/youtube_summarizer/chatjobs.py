import asyncio
import uuid
import json

# In the future, I would like to have the Job pattern be more generalized. Instead of having two different job classes with different logic, have one job class class
# With a single "state" field, and then any change to "state" broadcasts just the change. Then clients read "state" at start, sync up, and then listen to new "state" updated.
# Simple and clean. However I'm pretty deep into the existing setup so I don't want to do that until a third job manager is required. At 3, its generalization time.


# Or someone else can do that... That would be nice...


# A chat job just streams the text of a single chat turn to clients 
# No complex state
class ChatJob:
    def __init__(self, video_id: str):
        self.video_id = video_id
        self.clients: dict[str, asyncio.Queue] = {}
        self.turn = 0
        self.text = ""
        self.is_responding = False

    async def broadcast(self, event, sleep_duration=0.01):
        for client in self.clients.values():
            await client.put(event)
        await asyncio.sleep(sleep_duration)

    async def broadcast_data(
        self,
        token: str,
        sleep_duration=0.001,  # Faster for streaming
    ):
        self.text += token
        await self.broadcast(token, sleep_duration)

    async def start_response(self):
        """Start a new response turn."""
        self.is_responding = True
        self.text = ""
        self.turn += 1

    async def finish_response(self):
        """Mark response as complete."""
        self.is_responding = False
        await self.broadcast("__RESPONSE_COMPLETE__")

    async def broadcast_error(self, error_message: str):
        """Broadcast error to all clients."""
        self.is_responding = False
        await self.broadcast(f"__ERROR__:{error_message}")

    def add_client(self):
        id = str(uuid.uuid4())
        new_q = asyncio.Queue()
        self.clients[id] = new_q
        return id, new_q

    def remove_client(self, client_id):
        del self.clients[client_id]

    def get_state(self):
        return json.dumps({
            "text": self.text,
            "turn": self.turn,
            "is_responding": self.is_responding
        })

    async def close(self):
        for client in self.clients.values():
            await client.put("close")
        await asyncio.sleep(0.01)


jobs: dict[str, ChatJob] = {}


def create_chat_job(video_id: str):
    new_job = ChatJob(video_id)
    jobs[video_id] = new_job
    return new_job


async def close_chat_job(video_id: str):
    if video_id in jobs:
        await jobs[video_id].close()
        del jobs[video_id]


def get_chat_job(video_id: str):
    return jobs.get(video_id)
