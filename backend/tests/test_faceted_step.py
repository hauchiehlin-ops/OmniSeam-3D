"""
Regression: faceted STEP files without a product structure (bare POLY_LOOP
shells, e.g. the bundled stepped_block.step sample) failed on the cloud node
with "Unable to parse CAD file", because OpenCASCADE cannot transfer them.
"""
import uuid
from datetime import datetime
from pathlib import Path

import numpy as np
import pytest
import trimesh

from backend.app.core.cad_engine import CADEngine
from backend.app.core.faceted_step import _triangulate, load_faceted_step
from backend.app.core.router import ConversionPipelineRouter
from backend.app.models.schemas import CADOptions, ConversionParams, TaskResponse, TaskStatus
from backend.app.storage.file_manager import file_manager

SAMPLE = Path(__file__).resolve().parents[2] / "frontend" / "public" / "samples" / "stepped_block.step"


def _new_task(filename: str, target: str) -> str:
    task_id = uuid.uuid4().hex
    file_manager.register_task(TaskResponse(
        task_id=task_id, filename=filename, status=TaskStatus.PENDING, progress=5,
        current_step="pending", target_format=target, created_at=datetime.utcnow(),
    ))
    return task_id


def _bare_faceted_step(mesh: trimesh.Trimesh) -> str:
    """Minimal faceted STEP: points, POLY_LOOPs, FACEs and a FACETED_BREP — no product."""
    lines, n = [], 100
    point_ids = []
    for v in mesh.vertices:
        lines.append(f"#{n}=CARTESIAN_POINT('',({v[0]:.4f},{v[1]:.4f},{v[2]:.4f}));")
        point_ids.append(n)
        n += 1
    face_ids = []
    for f in mesh.faces:
        lines.append(f"#{n}=POLY_LOOP('',({','.join(f'#{point_ids[i]}' for i in f)}));")
        lines.append(f"#{n + 1}=FACE_OUTER_BOUND('',#{n},.T.);")
        lines.append(f"#{n + 2}=FACE('',(#{n + 1}));")
        face_ids.append(n + 2)
        n += 3
    lines.append(f"#{n}=CLOSED_SHELL('',({','.join(f'#{i}' for i in face_ids)}));")
    lines.append(f"#{n + 1}=FACETED_BREP('x',#{n});")
    return "ISO-10303-21;\nHEADER;\nENDSEC;\nDATA;\n" + "\n".join(lines) + "\nENDSEC;\nEND-ISO-10303-21;\n"


@pytest.mark.skipif(not SAMPLE.exists(), reason="sample missing")
def test_sample_stepped_block_is_read_as_closed_solid():
    mesh = load_faceted_step(SAMPLE)
    assert mesh is not None
    assert mesh.is_watertight
    assert mesh.volume > 0  # outward-facing normals
    assert np.allclose(mesh.bounds, [[0, 0, 0], [30, 20, 30]])


@pytest.mark.skipif(not SAMPLE.exists(), reason="sample missing")
def test_cad_engine_falls_back_to_faceted_reader():
    mesh = CADEngine.load_cad_file(SAMPLE, CADOptions())
    assert isinstance(mesh, trimesh.Trimesh) and len(mesh.faces) > 0


@pytest.mark.skipif(not SAMPLE.exists(), reason="sample missing")
def test_sample_step_to_3mf_watertight_task_completes():
    """The exact request from the bug report: stepped_block.step -> 3MF, watertight strategy."""
    params = ConversionParams.model_validate({
        "target_format": "3mf",
        "repair_options": {
            "auto_fill_holes": True, "fix_non_manifold": True, "unify_normals": True,
            "remove_degenerate": True, "weld_vertices": True,
        },
    })
    result = ConversionPipelineRouter.process_task(_new_task(SAMPLE.name, "3mf"), SAMPLE, params)
    assert result.status == TaskStatus.COMPLETED, result.error
    assert result.report.watertight_achieved


def test_bare_faceted_box_roundtrip(tmp_path):
    box = trimesh.creation.box(extents=[10, 20, 30])
    path = tmp_path / "box.step"
    path.write_text(_bare_faceted_step(box))
    mesh = load_faceted_step(path)
    assert mesh.is_watertight
    assert mesh.volume == pytest.approx(6000.0)


def test_concave_polygon_triangulation_covers_area():
    # L-shaped hexagon (concave), counter-clockwise, area 3.
    pts = np.array([[0, 0, 0], [2, 0, 0], [2, 1, 0], [1, 1, 0], [1, 2, 0], [0, 2, 0]], dtype=float)
    tris = _triangulate(pts)
    assert len(tris) == 4
    area = sum(0.5 * np.linalg.norm(np.cross(pts[b] - pts[a], pts[c] - pts[a])) for a, b, c in tris)
    assert area == pytest.approx(3.0)
    # Winding preserved: every triangle normal points +Z like the loop.
    for a, b, c in tris:
        assert np.cross(pts[b] - pts[a], pts[c] - pts[a])[2] > 0


def test_non_faceted_file_returns_none(tmp_path):
    path = tmp_path / "plain.step"
    path.write_text("ISO-10303-21;\nDATA;\n#1=CARTESIAN_POINT('',(0.,0.,0.));\nENDSEC;\n")
    assert load_faceted_step(path) is None
