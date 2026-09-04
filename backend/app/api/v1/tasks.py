from pathlib import Path
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from backend.app.models.schemas import TaskResponse, TaskStatus
from backend.app.storage.file_manager import file_manager

router = APIRouter()


@router.get("/tasks/{task_id}", response_model=TaskResponse)
def get_task_status(task_id: str):
    """Retrieves conversion task status, progress percentage, and health audit report."""
    task = file_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.get("/tasks/{task_id}/download")
def download_converted_file(task_id: str):
    """Downloads the converted and repaired target 3D model file."""
    task = file_manager.get_task(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status != TaskStatus.COMPLETED:
        raise HTTPException(status_code=400, detail=f"Task is in status '{task.status.value}', not completed yet.")

    out_file = file_manager.get_output_file_path(task_id, task.target_format)
    if not out_file.exists():
        # Fallback to preview.glb if custom format wasn't written
        out_file = file_manager.get_preview_file_path(task_id)
    
    if not out_file.exists():
        raise HTTPException(status_code=404, detail="Output file not found on disk")

    base_name = Path(task.filename).stem
    download_filename = f"{base_name}_polyheal.{task.target_format}"
    
    return FileResponse(
        path=str(out_file),
        filename=download_filename,
        media_type="application/octet-stream"
    )


@router.get("/tasks/{task_id}/preview")
def get_preview_glb(task_id: str):
    """Streams the optimized WebGL preview binary GLB for Three.js viewport."""
    preview_file = file_manager.get_preview_file_path(task_id)
    if not preview_file.exists():
        raise HTTPException(status_code=404, detail="Preview GLB not generated yet")

    return FileResponse(
        path=str(preview_file),
        media_type="model/gltf-binary"
    )
