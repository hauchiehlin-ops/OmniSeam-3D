import io
import os
import time
import json
import uuid
import shutil
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
import trimesh

from backend.app.storage.file_manager import file_manager
from backend.app.core.optimizer import MeshOptimizer

router = APIRouter()

# 2 hours TTL for temporary AR sessions
SESSION_TTL_SECONDS = 7200


class ArSessionResponse(BaseModel):
    session_id: str
    filename: str
    glb_url: str
    usdz_url: Optional[str] = None
    created_at: str


def cleanup_expired_sessions():
    """Removes AR session directories older than TTL."""
    try:
        ar_root = file_manager.processed_dir / "ar_sessions"
        if not ar_root.exists():
            return
        now = time.time()
        for item in ar_root.iterdir():
            if item.is_dir():
                try:
                    mtime = item.stat().st_mtime
                    if now - mtime > SESSION_TTL_SECONDS:
                        shutil.rmtree(item, ignore_errors=True)
                except Exception:
                    pass
    except Exception:
        pass


@router.post("/session", response_model=ArSessionResponse)
async def create_ar_session(
    file: Optional[UploadFile] = File(None),
    task_id: Optional[str] = Form(None),
    filename: Optional[str] = Form(None),
):
    """
    Creates a temporary AR session to allow mobile devices to access and stream the 3D model.
    Accepts either an uploaded file (GLB/USDZ/STL/OBJ) or an existing conversion task_id.
    """
    cleanup_expired_sessions()

    session_id = f"ar_{uuid.uuid4().hex[:10]}"
    session_dir = file_manager.get_ar_dir(session_id)
    created_at = datetime.now(timezone.utc).isoformat()

    resolved_filename = filename or "model.glb"
    has_usdz = False

    if task_id:
        # Link from existing conversion task
        task = file_manager.get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail=f"Task {task_id} not found")
        resolved_filename = task.filename

        preview_file = file_manager.get_preview_file_path(task_id)
        if not preview_file.exists():
            raise HTTPException(status_code=400, detail="Task preview GLB not generated yet")
        
        target_glb = session_dir / "model.glb"
        shutil.copyfile(preview_file, target_glb)

    elif file:
        resolved_filename = filename or file.filename or "model.glb"
        content = await file.read()
        ext = Path(resolved_filename).suffix.lower()

        if ext in [".glb", ".gltf"]:
            target_glb = session_dir / "model.glb"
            with open(target_glb, "wb") as f:
                f.write(content)
        elif ext == ".usdz":
            target_usdz = session_dir / "model.usdz"
            with open(target_usdz, "wb") as f:
                f.write(content)
            has_usdz = True
        else:
            # STL, OBJ, PLY, etc. -> convert to GLB via trimesh
            try:
                mesh = trimesh.load(io.BytesIO(content), file_type=ext.lstrip("."))
                if isinstance(mesh, trimesh.Scene):
                    mesh = mesh.dump(concatenate=True)
                target_glb = session_dir / "model.glb"
                MeshOptimizer.export_glb(mesh, target_glb, compress=False)
            except Exception:
                target_glb = session_dir / "model.glb"
                with open(target_glb, "wb") as f:
                    f.write(content)
    else:
        raise HTTPException(status_code=400, detail="Must provide either file or task_id")

    session_info = {
        "session_id": session_id,
        "filename": resolved_filename,
        "glb_url": f"/api/v1/ar/{session_id}/model.glb",
        "usdz_url": f"/api/v1/ar/{session_id}/model.usdz" if has_usdz else None,
        "created_at": created_at,
    }

    with open(session_dir / "session.json", "w", encoding="utf-8") as f:
        json.dump(session_info, f, ensure_ascii=False, indent=2)

    return ArSessionResponse(**session_info)


@router.get("/{session_id}", response_model=ArSessionResponse)
def get_ar_session(session_id: str):
    """Retrieves metadata of an active AR session."""
    session_dir = file_manager.get_ar_dir(session_id)
    session_file = session_dir / "session.json"
    if not session_file.exists():
        raise HTTPException(status_code=404, detail="AR session not found or expired")

    with open(session_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    return ArSessionResponse(**data)


@router.get("/{session_id}/model.glb")
def stream_ar_glb(session_id: str):
    """Streams the binary GLB for Three.js viewport and Android Scene Viewer."""
    session_dir = file_manager.get_ar_dir(session_id)
    glb_path = session_dir / "model.glb"
    if not glb_path.exists():
        raise HTTPException(status_code=404, detail="GLB model not found in this AR session")

    session_file = session_dir / "session.json"
    download_name = "model.glb"
    if session_file.exists():
        try:
            with open(session_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                download_name = f"{Path(data.get('filename', 'model')).stem}.glb"
        except Exception:
            pass

    return FileResponse(
        path=str(glb_path),
        media_type="model/gltf-binary",
        filename=download_name,
    )


@router.get("/{session_id}/model.usdz")
def stream_ar_usdz(session_id: str):
    """Streams the USDZ binary for iOS Quick Look."""
    session_dir = file_manager.get_ar_dir(session_id)
    usdz_path = session_dir / "model.usdz"
    if not usdz_path.exists():
        raise HTTPException(status_code=404, detail="USDZ model not found in this AR session")

    session_file = session_dir / "session.json"
    download_name = "model.usdz"
    if session_file.exists():
        try:
            with open(session_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                download_name = f"{Path(data.get('filename', 'model')).stem}.usdz"
        except Exception:
            pass

    return FileResponse(
        path=str(usdz_path),
        media_type="model/vnd.usdz+zip",
        filename=download_name,
    )
