"""Helpers for turning whatever a loader returns into one triangle mesh."""
from typing import Any

import trimesh


def ensure_trimesh(loaded: Any, source: str = "model") -> trimesh.Trimesh:
    """
    Returns a single `trimesh.Trimesh` for any loader result.

    `trimesh.load` returns a `trimesh.Scene` (not a mesh) whenever a file
    holds more than one body: multi-solid STL from FreeCAD, STEP assemblies,
    OBJ/glTF/3MF with several objects. A Scene has no `.vertices`, so passing
    it on unchanged makes the pipeline fail with
    "'Scene' object has no attribute 'vertices'".

    Scene geometry is baked with its transforms (`dump()`), non-surface
    geometry (edges, point clouds) is dropped and the remaining meshes are
    concatenated into one.
    """
    if isinstance(loaded, trimesh.Trimesh):
        return loaded

    if isinstance(loaded, trimesh.Scene):
        meshes = [
            geom
            for geom in loaded.dump()
            if isinstance(geom, trimesh.Trimesh) and len(geom.faces) > 0
        ]
        if not meshes:
            raise ValueError(f"'{source}' contains no surface geometry (no triangles found).")
        return meshes[0] if len(meshes) == 1 else trimesh.util.concatenate(meshes)

    vertices = getattr(loaded, "vertices", None)
    faces = getattr(loaded, "faces", None)
    if vertices is not None and faces is not None and len(faces) > 0:
        return trimesh.Trimesh(vertices=vertices, faces=faces)

    raise ValueError(f"'{source}' could not be read as a triangle mesh ({type(loaded).__name__}).")
