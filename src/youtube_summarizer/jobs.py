import asyncio
import uuid
import json


class Job:
    def __init__(self, video_id: str):
        self.clients: dict[str, asyncio.Queue] = {}
        self.job_state = {
            "status": "starting",
            "download_progress": 0,
            "transcript_buffer": "",
            "summary_buffer": "",
        }

    async def broadcast(self, event, sleep_duration=0.01):
        for client in self.clients.values():
            await client.put(event)
        await asyncio.sleep(sleep_duration)

    async def update_status(self, status: str, message: str):
        """Update job status and broadcast status_update event."""
        self.job_state["status"] = status
        await self.broadcast(
            {"type": "status_update", "data": {"status": status, "message": message}}
        )

    async def broadcast_data(
        self,
        event_type: str,
        data: dict,
        state_updates: dict = {},
        sleep_duration=0.01,
    ):
        """Broadcast event with optional state updates."""
        if state_updates:
            self.job_state.update(state_updates)
        await self.broadcast({"type": event_type, "data": data}, sleep_duration)

    def add_client(self):
        id = str(uuid.uuid4())
        new_q = asyncio.Queue()
        self.clients[id] = new_q
        return id, new_q

    def remove_client(self, client_id):
        del self.clients[client_id]

    def get_state(self):
        return json.dumps(self.job_state)

    async def close(self):
        for client in self.clients.values():
            await client.put("close")
        await asyncio.sleep(0.01)


jobs: dict[str, Job] = {}


def create_job(video_id: str):
    new_job = Job(video_id)
    jobs[video_id] = new_job
    return new_job


async def close_job(video_id: str):
    await jobs[video_id].close()
    del jobs[video_id]


def get_job(video_id: str):
    return jobs.get(video_id)
