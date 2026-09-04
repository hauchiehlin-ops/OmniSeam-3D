import json
import uuid
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException
from datetime import datetime

from backend.app.models.schemas import (
    TaskResponse,
    TaskStatus,
    ConversionParams,
    TargetFormat,
    SupportedLanguage
)
from backend.app.storage.file_manager import file_manager
from backend.app.core.router import ConversionPipelineRouter
from backend.app.i18n import get_text

router = APIRouter()


def run_conversion_background(task_id: str, input_path: Path, params: ConversionParams):
    ConversionPipelineRouter.process_task(task_id, input_path, params)


@router.post("/convert", response_model=TaskResponse)
async def convert_model(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    target_format: str = Form("glb"),
    cad_linear_deflection: float = Form(0.005),
    cad_angular_deflection: float = Form(0.1),
    enable_sewing: bool = Form(True),
    sewing_tolerance: float = Form(0.001),
    auto_fill_holes: bool = Form(True),
    fix_non_manifold: bool = Form(True),
    unify_normals: bool = Form(True),
    remove_degenerate: bool = Form(True),
    weld_vertices: bool = Form(True),
    compress_gltf: bool = Form(True),
    language: str = Form("en"),
    sync: bool = Form(False)
):
    """
    Uploads a 3D model, creates an asynchronous or synchronous conversion task,
    and runs the auto-healing pipeline.
    """
    task_id = str(uuid.uuid4())
    content = await file.read()
    
    # Save upload
    saved_path = file_manager.save_upload_file(task_id, file.filename, content)
    
    # Parse format
    try:
        t_fmt = TargetFormat(target_format.lower())
    except ValueError:
        t_fmt = TargetFormat.GLB

    lang_enum = SupportedLanguage.ZH_TW if language.lower() in ["zh", "zh-tw", "zh_tw"] else SupportedLanguage.EN

    params = ConversionParams(
        target_format=t_fmt,
        cad_options={
            "linear_deflection": cad_linear_deflection,
            "angular_deflection": cad_angular_deflection,
            "enable_sewing": enable_sewing,
            "sewing_tolerance": sewing_tolerance
        },
        repair_options={
            "auto_fill_holes": auto_fill_holes,
            "fix_non_manifold": fix_non_manifold,
            "unify_normals": unify_normals,
            "remove_degenerate": remove_degenerate,
            "weld_vertices": weld_vertices
        },
        output_options={
            "compress_gltf": compress_gltf,
            "generate_preview": True,
            "language": lang_enum
        }
    )

    initial_task = TaskResponse(
        task_id=task_id,
        filename=file.filename,
        status=TaskStatus.PENDING,
        progress=5,
        current_step=get_text("status.pending", lang_enum.value),
        target_format=t_fmt.value,
        created_at=datetime.utcnow()
    )
    file_manager.register_task(initial_task)

    if sync:
        # Run directly
        result_task = ConversionPipelineRouter.process_task(task_id, saved_path, params)
        return result_task
    else:
        # Background worker
        background_tasks.add_task(run_conversion_background, task_id, saved_path, params)
        return initial_task
