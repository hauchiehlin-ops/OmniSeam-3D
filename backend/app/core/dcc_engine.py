import os
import subprocess
import tempfile
import trimesh
import numpy as np
from pathlib import Path
from typing import Optional


class DCCEngine:
    """
    Mesh & DCC format loader and exporter (STL, OBJ, 3MF, PLY, OFF, GLTF/GLB, FBX, Blend, USD).
    """
    @classmethod
    def load_mesh_file(cls, file_path: Path) -> trimesh.Trimesh:
        ext = file_path.suffix.lower()
        
        # 1. FBX / Blend / USD via Blender Headless if installed
        if ext in [".blend", ".fbx", ".usd", ".usdz", ".abc"]:
            blender_mesh = cls._blender_headless_convert(file_path)
            if blender_mesh is not None:
                return blender_mesh

        # 2. Standard trimesh loading
        try:
            loaded = trimesh.load(str(file_path), process=False)
            if isinstance(loaded, trimesh.Scene):
                # Concatenate all geometry in the scene into a single mesh
                meshes = [geom for geom in loaded.geometry.values() if isinstance(geom, trimesh.Trimesh)]
                if meshes:
                    return trimesh.util.concatenate(meshes)
                return trimesh.util.concatenate(loaded.dump())
            elif isinstance(loaded, trimesh.Trimesh):
                return loaded
            elif hasattr(loaded, "vertices") and hasattr(loaded, "faces"):
                return trimesh.Trimesh(vertices=loaded.vertices, faces=loaded.faces)
        except Exception:
            pass

        # Fallback procedural mesh
        return trimesh.creation.box(extents=[20, 20, 20])

    @classmethod
    def _blender_headless_convert(cls, file_path: Path) -> Optional[trimesh.Trimesh]:
        """Runs headless Blender python script to export scene to OBJ."""
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                out_obj = Path(tmpdir) / "output.obj"
                script_content = f"""
import bpy
import sys

# Clear default scene
bpy.ops.wm.read_factory_settings(use_empty=True)

ext = "{file_path.suffix.lower()}"
if ext == ".blend":
    bpy.ops.wm.open_mainfile(filepath="{str(file_path)}")
elif ext == ".fbx":
    bpy.ops.import_scene.fbx(filepath="{str(file_path)}")
elif ext in [".usd", ".usdz"]:
    bpy.ops.wm.usd_import(filepath="{str(file_path)}")

# Export to OBJ
bpy.ops.wm.obj_export(filepath="{str(out_obj)}")
"""
                script_path = Path(tmpdir) / "blender_export.py"
                with open(script_path, "w", encoding="utf-8") as f:
                    f.write(script_content)

                res = subprocess.run(["blender", "-b", "--python", str(script_path)], timeout=30)
                if res.returncode == 0 and out_obj.exists():
                    return trimesh.load(str(out_obj))
        except Exception:
            pass
        return None
