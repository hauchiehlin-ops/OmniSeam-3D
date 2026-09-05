import pytest
import numpy as np
from pathlib import Path
from backend.app.models.schemas import CADOptions
from backend.app.core.cad_engine import CADEngine


def test_cad_options_defaults():
    options = CADOptions()
    assert options.linear_deflection == 0.005
    assert options.angular_deflection == 0.1
    assert options.enable_sewing is True
    assert options.sewing_tolerance == 0.001


def test_cad_engine_invalid_file_raises():
    dummy_path = Path("/tmp/nonexistent_sample_engine.step")
    options = CADOptions(linear_deflection=0.005)
    with pytest.raises(ValueError, match="Unable to parse CAD file"):
        CADEngine.load_cad_file(dummy_path, options)


def test_cad_engine_step_export_structure(tmp_path):
    import trimesh
    box = trimesh.creation.box(extents=[10, 10, 10])
    out_step = tmp_path / "test_out.step"
    CADEngine._export_step_facets(box, out_step)
    
    assert out_step.exists()
    content = out_step.read_text(encoding="utf-8")
    assert "ISO-10303-21;" in content
    assert "=PLANE(" in content
    assert "POLY_LOOP('',(#" in content
    assert "FACE_SURFACE('',(#" in content
    assert "=AXIS2_PLACEMENT_3D(" in content
    assert "#20=FACETED_BREP('Solid1',#21);" in content


def test_cad_engine_ransac_plane_fitting():
    # Generate 100 points on plane Z = 5.0 with small noise
    xy = np.random.uniform(-10, 10, size=(100, 2))
    z = np.full((100, 1), 5.0) + np.random.normal(0, 0.001, size=(100, 1))
    pts = np.hstack([xy, z])

    plane_fit = CADEngine.fit_plane_ransac(pts, distance_threshold=0.01)
    assert plane_fit is not None
    _, normal = plane_fit
    # Normal should be close to [0, 0, 1] or [0, 0, -1]
    assert abs(abs(normal[2]) - 1.0) < 0.05
