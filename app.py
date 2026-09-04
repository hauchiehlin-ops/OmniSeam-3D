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

# 1. ZeroGPU Global Hook (Must be defined at module top-level for pySpaces inspection)
try:
    import spaces
    @spaces.GPU(duration=60)
    def zerogpu_event():
        return "ZeroGPU Ready"
except Exception:
    def zerogpu_event():
        return "CPU Ready"

# 2. Create FastAPI Application
app = FastAPI(
    title="OmniSeam 3D Dedicated Engine Node",
    description="Dedicated CAD & Mesh Auto-Healing REST API Node for OmniSeam 3D",
    version="1.0.35",
    docs_url="/docs",
    redoc_url="/redoc",
)

# 3. Add CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 4. Mount REST API Router (/api/v1)
app.include_router(api_v1_router, prefix=settings.API_V1_STR)

# 5. Build Gradio UI
with gr.Blocks(title="OmniSeam 3D Engine Node") as demo:
    gr.Markdown("""
    # 💎 OmniSeam 3D - Dedicated Engine Node
    This Hugging Face Space is a dedicated CAD & Mesh Repair translation node for [OmniSeam 3D Web App](https://omniseam-3d.vercel.app).
    
    ### 📊 System Status
    - **Engine**: FastAPI + FreeCAD + OpenCASCADE + Trimesh
    - **Hardware Tier**: 16 GB RAM · 2 vCPU (ZeroGPU / CPU Basic Compatible)
    - **REST API Swagger**: [Click to view /docs](/docs)
    - **Health Check Endpoint**: [Click to check /api/v1/health](/api/v1/health)
    
    ### 🔗 How to Connect to OmniSeam 3D
    1. Copy your Space URL: `https://<your-username>-<space-name>.hf.space`
    2. Open [OmniSeam 3D Web App](https://omniseam-3d.vercel.app)
    3. Click **Engine Node** in the top navigation bar, paste this URL, and click **⚡ Test & Connect**!
    """)

    dummy_btn = gr.Button("GPU Warmup", visible=False)
    dummy_btn.click(fn=zerogpu_event)

# 6. Mount Gradio UI onto FastAPI root path
app = gr.mount_gradio_app(app, demo, path="/")

# 7. Launch Server
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=7860)










