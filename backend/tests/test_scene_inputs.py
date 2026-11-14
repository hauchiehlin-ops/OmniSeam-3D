"""
Regression: loaders that return a multi-body `trimesh.Scene` (FreeCAD STL,
STEP assemblies) used to crash the pipeline with
"'Scene' object has no attribute 'vertices'".
"""
import uuid
from datetime import datetime
from pathlib import Path

import pytest
import trimesh

from backend.app.core.cad_engine import CADEngine
from backend.app.core.router import ConversionPipelineRouter
from backend.app.models.schemas import ConversionParams, TaskResponse, TaskStatus
from backend.app.storage.file_manager import file_manager
from backend.app.utils.mesh_utils import ensure_trimesh

MULTI_SOLID_STL = """solid Body1
facet normal 0 0 1
outer loop
vertex 0 0 0
vertex 1 0 0
vertex 0 1 0
endloop
endfacet
endsolid Body1
solid Body2
facet normal 0 0 1
outer loop
vertex 5 0 0
vertex 6 0 0
vertex 5 1 0
endloop
endfacet
endsolid Body2
"""

REVIEW_STEP = Path(__file__).resolve().parents[2] / "docs" / "app-store" / "test-files" / "review_test_plate.step"


def _new_task(filename: str, target: str) -> str:
    task_id = uuid.uuid4().hex
    file_manager.register_task(TaskResponse(
        task_id=task_id, filename=filename, status=TaskStatus.PENDING, progress=5,
        current_step="pending", target_format=target, created_at=datetime.utcnow(),
    ))
    return task_id


def _two_box_scene() -> trimesh.Scene:
    scene = trimesh.Scene()
    scene.add_geometry(trimesh.creation.box(extents=[10, 10, 10]), node_name="a")
    scene.add_geometry(
        trimesh.creation.box(extents=[5, 5, 5]),
        node_name="b",
        transform=trimesh.transformations.translation_matrix([30, 0, 0]),
    )
    return scene


def test_multi_solid_stl_loads_as_scene(tmp_path):
    path = tmp_path / "multi.stl"
    path.write_text(MULTI_SOLID_STL)
    assert isinstance(trimesh.load(str(path)), trimesh.Scene)


def test_ensure_trimesh_concatenates_scene_with_transforms():
    mesh = ensure_trimesh(_two_box_scene())
    assert isinstance(mesh, trimesh.Trimesh)
    assert len(mesh.faces) == 24
    # The second box keeps its 30 mm offset.
    assert mesh.bounds[1][0] == pytest.approx(32.5)


def test_ensure_trimesh_passes_trimesh_through():
    box = trimesh.creation.box()
    assert ensure_trimesh(box) is box


def test_ensure_trimesh_rejects_scene_without_surfaces():
    with pytest.raises(ValueError, match="no surface geometry"):
        ensure_trimesh(trimesh.Scene())


def test_router_normalizes_scene_from_cad_engine(tmp_path, monkeypatch):
    """Simulates the FreeCAD path returning a multi-body Scene for a STEP file."""
    monkeypatch.setattr(CADEngine, "load_cad_file", classmethod(lambda cls, p, o: _two_box_scene()))
    step = tmp_path / "assembly.step"
    step.write_text("dummy")
    mesh = ConversionPipelineRouter.load_input_file(step, ConversionParams(target_format="3mf"))
    assert isinstance(mesh, trimesh.Trimesh)
    assert len(mesh.faces) == 24


def test_scene_step_converts_to_3mf_with_watertight_repair(tmp_path, monkeypatch):
    """End-to-end task from the bug report: STEP -> 3MF, watertight strategy."""
    monkeypatch.setattr(CADEngine, "load_cad_file", classmethod(lambda cls, p, o: _two_box_scene()))
    params = ConversionParams.model_validate({
        "target_format": "3mf",
        "repair_options": {
            "auto_fill_holes": True, "fix_non_manifold": True, "unify_normals": True,
            "remove_degenerate": True, "weld_vertices": True,
        },
    })
    step = tmp_path / "assembly.step"
    step.write_text("dummy")
    result = ConversionPipelineRouter.process_task(_new_task("assembly.step", "3mf"), step, params)
    assert result.status == TaskStatus.COMPLETED, result.error


@pytest.mark.skipif(not REVIEW_STEP.exists(), reason="review STEP sample missing")
def test_review_step_file_converts_to_3mf(tmp_path):
    pytest.importorskip("cascadio")
    params = ConversionParams.model_validate({"target_format": "3mf"})
    result = ConversionPipelineRouter.process_task(_new_task(REVIEW_STEP.name, "3mf"), REVIEW_STEP, params)
    assert result.status == TaskStatus.COMPLETED, result.error
