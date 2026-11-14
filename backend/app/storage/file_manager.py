import os
import shutil
import uuid
import json
from typing import Optional, Dict, Any
from pathlib import Path
from backend.app.config import settings
from backend.app.models.schemas import TaskResponse, TaskStatus


class FileManager:
    def __init__(self):
        self.upload_dir = Path(settings.UPLOAD_DIR)
        self.processed_dir = Path(settings.PROCESSED_DIR)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.processed_dir.mkdir(parents=True, exist_ok=True)
        self._tasks: Dict[str, TaskResponse] = {}

    def create_task_dir(self, task_id: str) -> Path:
        task_dir = self.processed_dir / task_id
        task_dir.mkdir(parents=True, exist_ok=True)
        return task_dir

    def get_task_dir(self, task_id: str) -> Path:
        return self.processed_dir / task_id

    def save_upload_file(self, task_id: str, filename: str, content: bytes) -> Path:
        task_upload_dir = self.upload_dir / task_id
        task_upload_dir.mkdir(parents=True, exist_ok=True)
        file_path = task_upload_dir / filename
        with open(file_path, "wb") as f:
            f.write(content)
        return file_path

    def register_task(self, task: TaskResponse):
        self._tasks[task.task_id] = task
        self.save_task_state_to_disk(task)

    def update_task(self, task_id: str, **kwargs) -> Optional[TaskResponse]:
        if task_id in self._tasks:
            task = self._tasks[task_id]
            for k, v in kwargs.items():
                if hasattr(task, k):
                    setattr(task, k, v)
            self.save_task_state_to_disk(task)
            return task
        # Try loading from disk
        task = self.load_task_state_from_disk(task_id)
        if task:
            for k, v in kwargs.items():
                if hasattr(task, k):
                    setattr(task, k, v)
            self._tasks[task_id] = task
            self.save_task_state_to_disk(task)
            return task
        return None

    def get_task(self, task_id: str) -> Optional[TaskResponse]:
        if task_id in self._tasks:
            return self._tasks[task_id]
        return self.load_task_state_from_disk(task_id)

    def save_task_state_to_disk(self, task: TaskResponse):
        try:
            task_dir = self.get_task_dir(task.task_id)
            task_dir.mkdir(parents=True, exist_ok=True)
            state_file = task_dir / "task_state.json"
            with open(state_file, "w", encoding="utf-8") as f:
                f.write(task.model_dump_json(indent=2))
        except Exception:
            pass

    def load_task_state_from_disk(self, task_id: str) -> Optional[TaskResponse]:
        state_file = self.get_task_dir(task_id) / "task_state.json"
        if state_file.exists():
            try:
                with open(state_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    task = TaskResponse.model_validate(data)
                    self._tasks[task_id] = task
                    return task
            except Exception:
                return None
        return None

    def get_output_file_path(self, task_id: str, extension: str) -> Path:
        return self.get_task_dir(task_id) / f"converted.{extension.lstrip('.')}"

    def get_preview_file_path(self, task_id: str) -> Path:
        return self.get_task_dir(task_id) / "preview.glb"


file_manager = FileManager()
