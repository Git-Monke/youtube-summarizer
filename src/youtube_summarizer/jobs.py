import asyncio
import uuid
import json


class Job:
    def __init__(self, video_id: str):
        self.clients: dict[str, asyncio.Queue] = {}
        self.job_state = {
            ["status"]: "starting",
            ["download_progress"]: 0,
            ["transcript_buffer"]: "",
            ["summary_buffer"]: "",
        }

    def broadcast(self, event):
        for client in self.clients:
            client.put(event)
        self.job_history.append(event)

    def add_client(self):
        id = uuid.uuid5()
        new_q = asyncio.Queue()
        self.clients[id] = new_q
        return id, new_q

    def remove_client(self, client_id):
        del self.clients[client_id]

    def get_state(self):
        return json.dumps(self.job_state)


jobs: dict[str, Job] = {}


def create_job(video_id: str):
    new_job = Job(video_id)
    jobs[video_id] = new_job
    return new_job


def get_job(video_id: str):
    return jobs.get(video_id)
