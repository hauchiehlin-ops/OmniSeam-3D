from fastapi import APIRouter
from backend.app.config import settings

router = APIRouter()


@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "supported_formats": [
            "step", "stp", "iges", "igs", "brep",
            "sldprt", "sldasm", "3dm", "ipt", "iam",
            "stl", "obj", "3mf", "ply", "off", "gltf", "glb",
            "ifc", "dxf", "dwg",
            "fbx", "blend", "usd", "usdz", "abc",
            "las", "pcd", "xyz"
        ]
    }
