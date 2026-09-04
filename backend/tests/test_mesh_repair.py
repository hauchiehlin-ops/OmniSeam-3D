import pytest
import trimesh
from backend.app.models.schemas import RepairOptions
from backend.app.core.mesh_repair import MeshRepairEngine
from backend.app.core.auditor import ModelAuditor
from backend.app.utils.sample_generator import Sample3DGenerator


def test_defective_mesh_healing_to_watertight():
    """Verify that an intentionally broken mesh with open holes is healed to a watertight solid."""
    broken_mesh = Sample3DGenerator.create_defective_mesh_with_holes()
    
    # Audit broken mesh
    initial_defects = ModelAuditor.detect_defects(broken_mesh)
    assert not broken_mesh.is_watertight or initial_defects.open_boundary_loops > 0

    # Execute repair
    options = RepairOptions(
        auto_fill_holes=True,
        fix_non_manifold=True,
        unify_normals=True,
        remove_degenerate=True,
        weld_vertices=True
    )
    repaired, defects_fixed, max_deviation = MeshRepairEngine.repair_mesh(broken_mesh, options)

    # Assertions
    assert repaired.is_watertight, "Repaired mesh must be a watertight closed solid"
    assert len(repaired.faces) > 0
    assert defects_fixed["holes_filled"] >= 0
    assert max_deviation <= 0.05, "Surface deviation must remain within tolerance"


def test_clean_bracket_preservation():
    """Verify that a clean watertight bracket is preserved without deformation."""
    bracket = Sample3DGenerator.create_watertight_bracket()
    initial_v_count = len(bracket.vertices)
    
    options = RepairOptions()
    repaired, defects_fixed, max_deviation = MeshRepairEngine.repair_mesh(bracket, options)

    assert repaired.is_watertight
    assert max_deviation <= 0.005
