import pytest
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
    assert "#19=PLANE('',#10);" in content
    assert "POLY_LOOP('',(#" in content
    assert "FACE_SURFACE('',(#" in content
    assert ",#19,.T.);" in content
    assert "#20=FACETED_BREP('Solid1',#21);" in content
