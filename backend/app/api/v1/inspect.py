import io
import uuid
import tempfile
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import Response

from backend.app.models.schemas import InspectResponse, ConversionParams
from backend.app.core.auditor import ModelAuditor
from backend.app.core.router import ConversionPipelineRouter
from backend.app.storage.file_manager import file_manager

router = APIRouter()


@router.post("/inspect", response_model=InspectResponse)
async def inspect_model(
    file: UploadFile = File(...),
    lang: str = Form("en")
):
    """
    Inspects 3D model geometry without converting, identifying holes,
    non-manifold edges, and returning coordinates for 3D visual defect inspection.
    """
    try:
        content = await file.read()
        file_size = len(content)
        
        # Write to temporary file for format router parsing
        suffix = Path(file.filename).suffix
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(content)
            tmp_path = Path(tmp.name)

        params = ConversionParams()
        mesh = ConversionPipelineRouter.load_input_file(tmp_path, params)
        tmp_path.unlink(missing_ok=True)

        return ModelAuditor.audit_mesh(mesh, filename=file.filename, file_size=file_size, lang=lang)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to inspect model: {str(e)}")
