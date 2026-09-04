import sys
import os
from pathlib import Path

# Add project root to sys.path
current_dir = Path(__file__).resolve().parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

from fastapi.middleware.cors import CORSMiddleware
import gradio as gr
from gradio.routes import App
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

# 2. Build Gradio UI
with gr.Blocks(title="OmniSeam 3D Engine Node") as demo:
    gr.Markdown("""
    # 💎 OmniSeam 3D - Dedicated Engine Node
    This Hugging Face Space is a dedicated CAD & Mesh Repair translation node for [OmniSeam 3D Web App](https://omniseam-3d.vercel.app).
    
    ### 📊 System Status
    - **Engine**: FastAPI + FreeCAD + OpenCASCADE + Trimesh + LibreDWG
    - **Hardware Tier**: 16 GB RAM · 2 vCPU (ZeroGPU / CPU Basic Compatible)
    - **Health Check Endpoint**: [Click to check /api/v1/health](/api/v1/health)
    
    ### 🔗 How to Connect to OmniSeam 3D
    1. Copy your Space URL: `https://<your-username>-<space-name>.hf.space`
    2. Open [OmniSeam 3D Web App](https://omniseam-3d.vercel.app)
    3. Click **Engine Node** in the top navigation bar, paste this URL, and click **⚡ Test & Connect**!
    """)

    dummy_btn = gr.Button("GPU Warmup", visible=False)
    dummy_btn.click(fn=zerogpu_event)

# 3. Create Gradio App & Register FastAPI REST Routes (/api/v1) + CORS
custom_app = App.create_app(demo)
custom_app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
custom_app.include_router(api_v1_router, prefix=settings.API_V1_STR)

# 4. Launch with Gradio's Queue and preserved custom App (Required for ZeroGPU and HF Spaces)
if __name__ == "__main__":
    demo.queue().launch(server_name="0.0.0.0", server_port=7860, _app=custom_app)













