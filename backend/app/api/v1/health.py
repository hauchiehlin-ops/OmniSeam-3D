from fastapi import APIRouter
from backend.app.config import settings
import time

router = APIRouter()

START_TIME = time.time()


@router.get("/health")
def health_check():
    has_freecad = False
    try:
        import FreeCAD  # noqa
        has_freecad = True
    except ImportError:
        pass

    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "uptime_seconds": round(time.time() - START_TIME, 2),
        "engine_features": {
            "freecad_available": has_freecad,
            "opencascade_available": True,
            "trimesh_available": True,
            "server_type": "FastAPI Dedicated CAD Node",
            "supported_modes": ["CAD B-Rep", "Mesh Auto-Healing", "Point Cloud Reconstruction", "BIM IFC"]
        },
        "supported_formats": [
            "step", "stp", "iges", "igs", "brep",
            "sldprt", "sldasm", "3dm", "ipt", "iam",
            "stl", "obj", "3mf", "ply", "off", "gltf", "glb",
            "ifc", "dxf", "dwg",
            "fbx", "blend", "usd", "usdz", "abc",
            "las", "pcd", "xyz"
        ]
    }
