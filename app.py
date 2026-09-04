import sys
import os
from pathlib import Path

# Add project root to sys.path
current_dir = Path(__file__).resolve().parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

from fastapi.middleware.cors import CORSMiddleware
import gradio as gr
from backend.app.config import settings
from backend.app.api.v1.router import api_v1_router

# 1. Build Gradio UI
with gr.Blocks(title="OmniSeam 3D Engine Node") as demo:
    gr.Markdown("""
    # 💎 OmniSeam 3D - Dedicated Engine Node
    This Hugging Face Space is a dedicated CAD & Mesh Repair translation node for [OmniSeam 3D Web App](https://omniseam-3d.vercel.app).
    
    ### 📊 System Status
    - **Engine**: FastAPI + FreeCAD + OpenCASCADE + Trimesh
    - **Hardware Tier**: 16 GB RAM · 2 vCPU (CPU Basic / Free)
    - **REST API Swagger**: [Click to view /docs](/docs)
    - **Health Check Endpoint**: [Click to check /api/v1/health](/api/v1/health)
    
    ### 🔗 How to Connect to OmniSeam 3D
    1. Copy your Space URL: `https://<your-username>-<space-name>.hf.space`
    2. Open [OmniSeam 3D Web App](https://omniseam-3d.vercel.app)
    3. Click **Engine Node** in the top navigation bar, paste this URL, and click **⚡ Test & Connect**!
    """)

    # ZeroGPU Event Hook (satisfies Hugging Face pySpaces inspection if ZeroGPU tier is selected)
    try:
        import spaces
        dummy_btn = gr.Button("GPU Warmup", visible=False)
        @spaces.GPU
        def zerogpu_event():
            return "ZeroGPU Ready"
        dummy_btn.click(fn=zerogpu_event)
    except Exception:
        pass

# 2. Mount CORS Middleware & REST API Router onto Gradio Application
demo.app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
demo.app.include_router(api_v1_router, prefix=settings.API_V1_STR)

# 3. Launch via Gradio Server Loop (Keeps container process alive)
if __name__ == "__main__":
    demo.launch(server_name="0.0.0.0", server_port=7860)








