import sys
import os
from pathlib import Path

# Add project root to sys.path
current_dir = Path(__file__).resolve().parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

from backend.app.config import settings
from backend.app.api.v1.router import api_v1_router
from fastapi.middleware.cors import CORSMiddleware
import gradio as gr

# 1. Build Gradio UI
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

# 2. Mount CORS & REST API onto Gradio's internal FastAPI app
demo.app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
demo.app.include_router(api_v1_router, prefix=settings.API_V1_STR)

# 3. Launch via Gradio without duplicate uvicorn binding and without Node SSR
if __name__ == "__main__":
    try:
        demo.launch(ssr_mode=False, prevent_thread_lock=False)
    except TypeError:
        demo.launch()
    
    # Keep main thread permanently alive in container environments
    import time
    while True:
        time.sleep(3600)


