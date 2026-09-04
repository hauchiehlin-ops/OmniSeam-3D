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


def test_cad_engine_placeholder_generation():
    dummy_path = Path("/tmp/sample_engine.step")
    options = CADOptions(linear_deflection=0.005)
    mesh = CADEngine.load_cad_file(dummy_path, options)
    
    assert mesh is not None
    assert len(mesh.vertices) > 0
    assert len(mesh.faces) > 0
