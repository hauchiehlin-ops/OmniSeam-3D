import pytest
from backend.app.core.auditor import ModelAuditor
from backend.app.utils.sample_generator import Sample3DGenerator


def test_model_auditor_watertight_mesh():
    mesh = Sample3DGenerator.create_watertight_bracket()
    metrics = ModelAuditor.compute_metrics(mesh)
    defects = ModelAuditor.detect_defects(mesh)
    health_score = ModelAuditor.calculate_health_score(metrics, defects)

    assert metrics.is_watertight is True
    assert metrics.volume > 0
    assert metrics.surface_area > 0
    assert health_score >= 80


def test_model_auditor_broken_mesh():
    mesh = Sample3DGenerator.create_defective_mesh_with_holes()
    metrics = ModelAuditor.compute_metrics(mesh)
    defects = ModelAuditor.detect_defects(mesh)
    health_score = ModelAuditor.calculate_health_score(metrics, defects)

    assert defects.open_boundary_loops > 0 or not metrics.is_watertight
    assert health_score < 100


def test_dxf_tessellation(tmp_path):
    import ezdxf
    from backend.app.core.bim_engine import BIMEngine
    
    dxf_file = tmp_path / "test_drawing.dxf"
    doc = ezdxf.new('R2010')
    msp = doc.modelspace()
    msp.add_line((0, 0, 0), (100, 0, 0))
    msp.add_line((100, 0, 0), (100, 80, 0))
    msp.add_circle((50, 40, 0), radius=20)
    msp.add_3dface([(0, 0, 10), (50, 0, 10), (50, 50, 10), (0, 50, 10)])
    doc.saveas(str(dxf_file))

    mesh = BIMEngine.load_dxf(dxf_file)
    assert mesh is not None
    assert len(mesh.vertices) > 0
    assert len(mesh.faces) > 0

