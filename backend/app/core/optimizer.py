import trimesh
import numpy as np
import subprocess
from pathlib import Path
from typing import Optional


class MeshOptimizer:
    """
    Geometry optimization, quantization, and WebGL preview GLB generator.
    Supports gltfpack / Draco compression pipeline where available.
    """
    @classmethod
    def export_glb(cls, mesh: trimesh.Trimesh, output_path: Path, compress: bool = True) -> Path:
        """Exports a clean, optimized binary GLB for WebGL streaming and Three.js consumption."""
        output_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Ensure vertex normals are computed and valid
        if not hasattr(mesh, "vertex_normals") or len(mesh.vertex_normals) == 0:
            mesh.fix_normals()

        # Add default metallic-roughness PBR visual styling if not present
        if mesh.visual.kind != "material":
            mesh.visual = trimesh.visual.ColorVisuals(
                mesh=mesh,
                vertex_colors=[[99, 102, 241, 255]] * len(mesh.vertices)  # Indigo modern primary
            )

        # Export standard binary GLB
        glb_bytes = mesh.export(file_type="glb")
        with open(output_path, "wb") as f:
            f.write(glb_bytes)

        # If gltfpack is available and compress requested, apply quantization
        if compress:
            cls._try_gltfpack(output_path)

        return output_path

    @classmethod
    def _try_gltfpack(cls, glb_path: Path):
        """Runs gltfpack CLI if present in system."""
        try:
            temp_out = glb_path.with_suffix(".opt.glb")
            res = subprocess.run(
                ["gltfpack", "-i", str(glb_path), "-o", str(temp_out), "-cc", "-kn"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                timeout=15
            )
            if res.returncode == 0 and temp_out.exists():
                temp_out.replace(glb_path)
        except Exception:
            pass
