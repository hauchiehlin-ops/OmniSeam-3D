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
