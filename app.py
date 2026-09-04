import sys
import os
from pathlib import Path

# Add project root to sys.path
current_dir = Path(__file__).resolve().parent
parent_dir = current_dir.parent

for p in [str(parent_dir), str(current_dir)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.app.main import app as fastapi_app
import gradio as gr

with gr.Blocks(title="OmniSeam 3D Engine Node") as demo:
    gr.Markdown("""
    # 💎 OmniSeam 3D - Dedicated Engine Node
    This Hugging Face Space is a dedicated CAD & Mesh Repair translation node for [OmniSeam 3D Web App](https://omniseam-3d.vercel.app).
    
    ### 📊 System Status
    - **Engine**: FastAPI + FreeCAD + OpenCASCADE + Trimesh
    - **Hardware Tier**: 16 GB RAM · 2 vCPU ($0 Free Tier)
    - **REST API Swagger**: [Click to view /docs](/docs)
    - **Health Check Endpoint**: [Click to check /api/v1/health](/api/v1/health)
    
    ### 🔗 How to Connect to OmniSeam 3D
    1. Copy your Space URL: `https://<your-username>-<space-name>.hf.space`
    2. Open [OmniSeam 3D Web App](https://omniseam-3d.vercel.app)
    3. Click **Engine Node** in the top navigation bar, paste this URL, and click **⚡ Test & Connect**!
    """)

# Mount Gradio app on top of FastAPI
app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    uvicorn.run(app, host="0.0.0.0", port=port)
