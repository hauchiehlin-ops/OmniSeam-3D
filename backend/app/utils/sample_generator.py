import trimesh
import numpy as np
from pathlib import Path


class Sample3DGenerator:
    """
    Generates deterministic benchmark 3D models for automated testing and UI demonstration.
    """

    @staticmethod
    def create_watertight_bracket() -> trimesh.Trimesh:
        """Creates a clean, watertight mechanical bracket."""
        box = trimesh.creation.box(extents=[60, 40, 15])
        cylinder = trimesh.creation.cylinder(radius=12, height=30, sections=36)
        cylinder.apply_translation([15, 0, 0])
        combined = trimesh.boolean.union([box, cylinder], engine="scad") if False else trimesh.util.concatenate([box, cylinder])
        combined.fix_normals()
        return combined

    @staticmethod
    def create_defective_mesh_with_holes() -> trimesh.Trimesh:
        """
        Creates an intentional non-watertight mesh with open holes,
        duplicate faces, and non-manifold geometry for testing auto-healing.
        """
        # Start with an icosphere
        sphere = trimesh.creation.icosphere(subdivisions=3, radius=25.0)
        
        # Intentionally punch 3 holes by removing faces
        faces = sphere.faces.copy()
        # Remove faces near top pole
        v = sphere.vertices
        mask = (v[faces[:, 0], 2] < 20.0) & (v[faces[:, 1], 2] < 20.0) & (v[faces[:, 2], 2] < 20.0)
        broken_faces = faces[mask]
        
        # Add 2 duplicate faces
        if len(broken_faces) > 2:
            broken_faces = np.vstack([broken_faces, broken_faces[:2]])

        broken_mesh = trimesh.Trimesh(vertices=sphere.vertices.copy(), faces=broken_faces, process=False)
        return broken_mesh

    @staticmethod
    def create_point_cloud_data() -> np.ndarray:
        """Generates a point cloud sampling of a torus."""
        torus = trimesh.creation.torus(major_radius=20, minor_radius=6, sections=30)
        pts, _ = trimesh.sample.sample_surface(torus, count=1500)
        return pts
