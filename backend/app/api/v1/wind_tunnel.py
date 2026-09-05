import uuid
import trimesh
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from datetime import datetime

from backend.app.models.schemas import (
    ConversionParams,
    WindTunnelParams,
    FluidDomainResponse,
    TargetFormat,
    BoundingBox
)
from backend.app.storage.file_manager import file_manager
from backend.app.core.router import ConversionPipelineRouter
from backend.app.core.cad_engine import CADEngine
from backend.app.core.auditor import ModelAuditor
from backend.app.config import settings

router = APIRouter()


@router.post("/extract", response_model=FluidDomainResponse)
async def extract_fluid_domain(
    file: UploadFile = File(...),
    inlet_factor: float = Form(2.0),
    outlet_factor: float = Form(5.0),
    margin_factor: float = Form(2.0),
    boolean_mode: str = Form("auto"),
    target_format: str = Form("step")
):
    """
    Extracts an aerodynamic wind tunnel fluid domain from the uploaded 3D model.
    Runs in-app Boolean extraction and exports the resulting fluid domain to standard CAD / Mesh formats.
    """
    task_id = str(uuid.uuid4())
    content = await file.read()
    
    content_size_mb = len(content) / (1024 * 1024)
    if settings.IS_PUBLIC_DEMO_NODE and content_size_mb > settings.PUBLIC_NODE_MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum upload size of {settings.PUBLIC_NODE_MAX_FILE_SIZE_MB}MB."
        )
    elif content_size_mb > settings.MAX_UPLOAD_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File exceeds maximum allowed size of {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    input_path = file_manager.save_upload_file(task_id, file.filename, content)

    # 1. Load input mesh
    try:
        raw_mesh = ConversionPipelineRouter.load_input_file(input_path, ConversionParams())
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse 3D model: {str(e)}")


    orig_metrics = ModelAuditor.compute_metrics(raw_mesh)

    # 2. Build WindTunnelParams
    params = WindTunnelParams(
        inlet_factor=inlet_factor,
        outlet_factor=outlet_factor,
        margin_factor=margin_factor,
        boolean_mode=boolean_mode,
        target_format=TargetFormat(target_format.lower().lstrip(".")) if target_format.lower().lstrip(".") in [t.value for t in TargetFormat] else TargetFormat.STEP
    )

    # 3. Generate wind tunnel fluid domain
    try:
        fluid_mesh, tunnel_box = CADEngine.generate_wind_tunnel_domain(raw_mesh, params)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Fluid domain extraction failed: {str(e)}")

    fluid_metrics = ModelAuditor.compute_metrics(fluid_mesh)

    # 4. Export fluid domain output file
    ext = params.target_format.value
    output_filename = f"{Path(file.filename).stem}_fluid_domain.{ext}"
    output_path = file_manager.get_task_dir(task_id) / output_filename

    try:
        if ext in ["step", "stp", "iges", "igs", "brep"]:
            CADEngine.export_cad_file(fluid_mesh, output_path, ext)
        elif ext == "dxf":
            fluid_mesh.export(str(output_path), file_type="dxf")
        else:
            fluid_mesh.export(str(output_path), file_type=ext)
    except Exception:
        try:
            CADEngine._export_step_facets(fluid_mesh, output_path)
        except Exception:
            fluid_mesh.export(str(output_path), file_type="stl")

    # 5. Export lightweight preview GLB for 3D Viewer rendering
    preview_filename = f"{Path(file.filename).stem}_fluid_domain_preview.glb"
    preview_path = file_manager.get_task_dir(task_id) / preview_filename
    try:
        fluid_mesh.export(str(preview_path), file_type="glb")
        preview_url = f"/api/v1/tasks/{task_id}/download/{preview_filename}"
    except Exception:
        preview_url = None

    download_url = f"/api/v1/tasks/{task_id}/download/{output_filename}"

    tunnel_bounds = BoundingBox(
        min=tunnel_box.bounds[0].tolist(),
        max=tunnel_box.bounds[1].tolist(),
        size=tunnel_box.extents.tolist()
    )

    return FluidDomainResponse(
        task_id=task_id,
        filename=output_filename,
        original_metrics=orig_metrics,
        fluid_domain_metrics=fluid_metrics,
        wind_tunnel_bounds=tunnel_bounds,
        download_url=download_url,
        preview_url=preview_url,
        created_at=datetime.utcnow()
    )
