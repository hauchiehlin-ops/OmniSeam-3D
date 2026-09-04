from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from backend.app.config import settings
from backend.app.api.v1.router import api_v1_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
    ## Universal 3D Model Converter & Auto-Healing Engine (PolyHeal 3D)
    
    High-fidelity, 100% FOSS 3D format conversion & autonomous mesh repair engine.
    Supports CAD (STEP, IGES, SolidWorks, Rhino), Mesh (STL, OBJ, 3MF, GLTF/GLB),
    BIM (IFC, DXF), and Point Clouds with automated B-Rep topology sewing,
    boundary hole filling, non-manifold resolution, and glTF optimization.
    """,
    openapi_tags=[
        {"name": "Health", "description": "System liveness and supported formats"},
        {"name": "Inspect", "description": "Geometric defect diagnosis and benchmarks"},
        {"name": "Convert", "description": "File upload and conversion dispatch"},
        {"name": "Tasks", "description": "Task status tracking, download, and WebGL preview"},
    ]
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API v1 Router
app.include_router(api_v1_router, prefix=settings.API_V1_STR)

# Serve Frontend static build if present
frontend_dist = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")


@app.get("/")
def root():
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "api_v1": settings.API_V1_STR
    }
