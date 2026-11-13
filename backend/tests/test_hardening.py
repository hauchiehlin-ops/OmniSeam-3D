import os
import time
from datetime import datetime, timedelta
from pathlib import Path

from fastapi.testclient import TestClient

from backend.app import hardening
from backend.app.config import settings
from backend.app.main import app
from backend.app.models.schemas import TaskResponse, TaskStatus
from backend.app.storage.file_manager import file_manager

client = TestClient(app)


def test_cors_allows_web_and_ios_origins():
    for origin in ("https://omniseam-3d.vercel.app", "capacitor://localhost", "https://omniseam-3d-git-ios-abc.vercel.app"):
        r = client.get("/api/v1/health", headers={"Origin": origin})
        assert r.headers.get("access-control-allow-origin") == origin, origin


def test_cors_rejects_unknown_origin():
    r = client.get("/api/v1/health", headers={"Origin": "https://evil.example.com"})
    assert "access-control-allow-origin" not in r.headers


def test_rate_limit_sliding_window(monkeypatch):
    monkeypatch.setattr(settings, "RATE_LIMIT_PER_MINUTE", 3)
    ip = "203.0.113.7"
    hardening._hits.pop(ip, None)
    now = 1_000_000.0
    assert [hardening.is_rate_limited(ip, now + i) for i in range(4)] == [False, False, False, True]
    # Window slides after 60 seconds.
    assert hardening.is_rate_limited(ip, now + 61.5) is False


def test_rate_limit_returns_429(monkeypatch):
    monkeypatch.setattr(settings, "RATE_LIMIT_PER_MINUTE", 1)
    hardening._hits.clear()
    headers = {"X-Forwarded-For": "198.51.100.9"}
    first = client.post("/api/v1/inspect", headers=headers)
    second = client.post("/api/v1/inspect", headers=headers)
    assert first.status_code != 429
    assert second.status_code == 429
    assert second.json()["detail"]["code"] == "RATE_LIMITED"
    hardening._hits.clear()


def test_sweeper_deletes_expired_files_only():
    upload_root = Path(settings.UPLOAD_DIR)
    processed_root = Path(settings.PROCESSED_DIR)
    old_dir = upload_root / "old_task"
    new_dir = processed_root / "new_task"
    old_dir.mkdir(parents=True, exist_ok=True)
    new_dir.mkdir(parents=True, exist_ok=True)
    (old_dir / "model.stl").write_text("solid x")
    (new_dir / "converted.stl").write_text("solid y")
    past = time.time() - (settings.FILE_TTL_MINUTES * 60 + 120)
    os.utime(old_dir, (past, past))

    hardening.sweep_expired_files()

    assert not old_dir.exists()
    assert new_dir.exists()


def test_stuck_task_times_out(monkeypatch):
    monkeypatch.setattr(settings, "TASK_TIMEOUT_SECONDS", 1)
    task = TaskResponse(
        task_id="stuck_task_1",
        filename="a.step",
        status=TaskStatus.CONVERTING,
        target_format="stl",
        created_at=datetime.utcnow() - timedelta(seconds=30),
    )
    file_manager.register_task(task)
    r = client.get("/api/v1/tasks/stuck_task_1")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "failed"
    assert body["error"]["code"] == "TASK_TIMEOUT"
