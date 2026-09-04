---
title: OmniSeam 3D Engine
emoji: 💎
colorFrom: blue
colorTo: indigo
sdk: docker
app_port: 7860
pinned: false
license: mit
---

# OmniSeam 3D - Dedicated CAD & Mesh Repair Engine

This is a dedicated **OmniSeam 3D** conversion and auto-healing node running on Python + FreeCAD + OpenCASCADE + Trimesh.

### Features
- **16 GB RAM + 2 vCPU** capability (via free Hugging Face Spaces)
- Supports heavy CAD formats: SolidWorks (`.sldprt`, `.sldasm`), Inventor (`.ipt`), Rhino (`.3dm`), STEP, IGES, IFC
- FreeCAD B-Rep sewing & tessellation
- REST API for [OmniSeam 3D Web Application](https://omniseam-3d.vercel.app)

### Connect to Web App
In the [OmniSeam 3D Web App](https://omniseam-3d.vercel.app):
1. Click the **Backend Node** badge in the top navigation bar.
2. Select **Hugging Face Spaces**.
3. Paste your Space URL: `https://<your-username>-omniseam-engine.hf.space`.
4. Click **⚡ Test & Connect**.
