"""
Operational hardening shared by both entry points (app.py on Hugging Face,
backend/app/main.py under Docker/uvicorn):

* explicit CORS allow-list (iOS/Android app WebView, local dev)
* per-IP rate limiting for upload endpoints
* background sweeper deleting uploads/results older than FILE_TTL_MINUTES
* soft per-task timeout (stuck tasks are reported as failed)
"""
from __future__ import annotations

import shutil
import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta
from pathlib import Path
from typing import Deque, Dict

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.config import settings

# Endpoints that accept file uploads / start heavy work.
RATE_LIMITED_PREFIXES = (
    f"{settings.API_V1_STR}/convert",
    f"{settings.API_V1_STR}/inspect",
    f"{settings.API_V1_STR}/wind-tunnel",
)

_hits: Dict[str, Deque[float]] = defaultdict(deque)
_hits_lock = threading.Lock()
_sweeper_started = False


def _client_ip(request: Request) -> str:
    # HF Spaces / reverse proxies put the real client first in X-Forwarded-For.
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def is_rate_limited(ip: str, now: float | None = None) -> bool:
    """Sliding 60-second window per IP. Returns True if the request must be rejected."""
    limit = settings.RATE_LIMIT_PER_MINUTE
    if limit <= 0:
        return False
    now = time.time() if now is None else now
    with _hits_lock:
        window = _hits[ip]
        while window and now - window[0] > 60:
            window.popleft()
        if len(window) >= limit:
            return True
        window.append(now)
        return False


def _remove_older_than(root: Path, max_age_seconds: float, now: float) -> int:
    removed = 0
    if not root.exists():
        return removed
    for item in root.iterdir():
        try:
            if now - item.stat().st_mtime > max_age_seconds:
                if item.is_dir():
                    shutil.rmtree(item, ignore_errors=True)
                else:
                    item.unlink(missing_ok=True)
                removed += 1
        except Exception:  # vanished or unreadable: skip
            continue
    return removed


def sweep_expired_files(now: float | None = None) -> int:
    """Deletes uploads and processed results older than FILE_TTL_MINUTES."""
    from backend.app.storage.file_manager import file_manager

    now = time.time() if now is None else now
    ttl = settings.FILE_TTL_MINUTES * 60
    removed = _remove_older_than(Path(settings.UPLOAD_DIR), ttl, now)
    removed += _remove_older_than(Path(settings.PROCESSED_DIR), ttl, now)
    # Drop in-memory task records whose files are gone.
    for task_id in list(file_manager._tasks.keys()):
        if not file_manager.get_task_dir(task_id).exists():
            file_manager._tasks.pop(task_id, None)
    return removed


def _sweeper_loop() -> None:
    while True:
        try:
            sweep_expired_files()
        except Exception:
            pass
        time.sleep(max(60, settings.CLEANUP_INTERVAL_SECONDS))


def start_sweeper() -> None:
    global _sweeper_started
    if _sweeper_started:
        return
    _sweeper_started = True
    threading.Thread(target=_sweeper_loop, name="omniseam-file-sweeper", daemon=True).start()


def apply_task_timeout(task):
    """Marks a task as failed if it has been running longer than TASK_TIMEOUT_SECONDS."""
    from backend.app.models.schemas import TaskStatus
    from backend.app.storage.file_manager import file_manager

    if task is None or task.status in (TaskStatus.COMPLETED, TaskStatus.FAILED):
        return task
    created = task.created_at
    if created.tzinfo is not None:
        created = created.replace(tzinfo=None)
    if datetime.utcnow() - created > timedelta(seconds=settings.TASK_TIMEOUT_SECONDS):
        return file_manager.update_task(
            task.task_id,
            status=TaskStatus.FAILED,
            progress=100,
            error={
                "code": "TASK_TIMEOUT",
                "message": f"Processing exceeded {settings.TASK_TIMEOUT_SECONDS} seconds on this node.",
                "i18n_key": "errors.task_timeout",
            },
        )
    return task


def install_hardening(app: FastAPI) -> None:
    """Adds CORS, rate limiting and the cleanup sweeper to a FastAPI app."""
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=settings.CORS_ORIGIN_REGEX or None,
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def _rate_limit(request: Request, call_next):
        if request.method == "POST" and request.url.path.startswith(RATE_LIMITED_PREFIXES):
            if is_rate_limited(_client_ip(request)):
                return JSONResponse(
                    status_code=429,
                    content={"detail": {"code": "RATE_LIMITED", "message": "Too many requests, please retry in a minute."}},
                    headers={"Retry-After": "60"},
                )
        return await call_next(request)

    start_sweeper()
