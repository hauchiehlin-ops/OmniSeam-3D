import sys
import os
from pathlib import Path

# Add project root to sys.path
current_dir = Path(__file__).resolve().parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import gradio as gr
import uvicorn

from backend.app.config import settings
from backend.app.api.v1.router import api_v1_router

# 1. Create FastAPI application
app = FastAPI(
    title="OmniSeam 3D Engine",
    version=settings.VERSION,
    description="Dedicated 3D CAD & Mesh Repair Engine Node",
)

# 2. Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 3. Mount REST API v1 Router
app.include_router(api_v1_router, prefix=settings.API_V1_STR)

# 4. Build Gradio UI
with gr.Blocks(title="OmniSeam 3D Engine Node") as demo:
    gr.Markdown("""
    # 💎 OmniSeam 3D - Dedicated Engine Node
    This Hugging Face Space is a dedicated CAD & Mesh Repair translation node for [OmniSeam 3D Web App](https://omniseam-3d.vercel.app).
    
    ### 📊 System Status
    - **Engine**: FastAPI + FreeCAD + OpenCASCADE + Trimesh
    - **Hardware Tier**: 16 GB RAM · 2 vCPU (ZeroGPU / Free)
    - **REST API Swagger**: [Click to view /docs](/docs)
    - **Health Check Endpoint**: [Click to check /api/v1/health](/api/v1/health)
    
    ### 🔗 How to Connect to OmniSeam 3D
    1. Copy your Space URL: `https://<your-username>-<space-name>.hf.space`
    2. Open [OmniSeam 3D Web App](https://omniseam-3d.vercel.app)
    3. Click **Engine Node** in the top navigation bar, paste this URL, and click **⚡ Test & Connect**!
    """)

# 5. Canonical Gradio + FastAPI mount
app = gr.mount_gradio_app(app, demo, path="/")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)

