from fastapi import APIRouter
from backend.app.config import settings
import time

router = APIRouter()

START_TIME = time.time()


@router.get("/health")
def health_check():
    import shutil

    # FreeCAD is used through the `freecadcmd` binary (apt package), not a Python import.
    has_freecad = shutil.which("freecadcmd") is not None
    if not has_freecad:
        try:
            import FreeCAD  # noqa
            has_freecad = True
        except ImportError:
            pass
    has_pythonocc = False
    try:
        import OCC.Core  # noqa
        has_pythonocc = True
    except ImportError:
        pass
    has_cascadio = False
    try:
        import cascadio  # noqa
        has_cascadio = True
    except ImportError:
        pass

    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "uptime_seconds": round(time.time() - START_TIME, 2),
        "engine_features": {
            "freecad_available": has_freecad,
            "opencascade_available": has_pythonocc or has_cascadio or has_freecad,
            "step_readers": [name for name, ok in (("freecad", has_freecad), ("pythonocc", has_pythonocc), ("cascadio", has_cascadio)) if ok],
            "trimesh_available": True,
            "server_type": "Official Public Demo Node" if settings.IS_PUBLIC_DEMO_NODE else "FastAPI Dedicated CAD Node",
            "is_public_demo": settings.IS_PUBLIC_DEMO_NODE,
            "max_upload_size_mb": settings.PUBLIC_NODE_MAX_FILE_SIZE_MB if settings.IS_PUBLIC_DEMO_NODE else settings.MAX_UPLOAD_SIZE_MB,
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
