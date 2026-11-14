---
title: OmniSeam 3D Engine
emoji: 💎
colorFrom: blue
colorTo: indigo
sdk: gradio
sdk_version: 4.44.0
app_file: app.py
pinned: false
license: mit
---

# OmniSeam 3D - Dedicated CAD & Mesh Repair Engine

This is a dedicated **OmniSeam 3D** conversion and auto-healing node running on Python + FreeCAD + OpenCASCADE + Trimesh.

### Features
- **16 GB RAM + 2 vCPU** capability (via free Hugging Face Spaces)
- Supports heavy CAD formats: SolidWorks (`.sldprt`, `.sldasm`), Inventor (`.ipt`), Rhino (`.3dm`), STEP, IGES, IFC
- FreeCAD B-Rep sewing & tessellation
- REST API for the [OmniSeam 3D](https://hauchiehlin-ops.github.io/OmniSeam-3D/) iPhone & iPad app

### Connect the app
In the OmniSeam 3D app on iPhone or iPad:
1. Tap the **Engine Node** badge in the top bar.
2. Select **Hugging Face Spaces**.
3. Paste your Space URL: `https://<your-username>-omniseam-engine.hf.space`.
4. Tap **Test connection**, then **Save and use this node**.
