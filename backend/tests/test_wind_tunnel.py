import pytest
import trimesh
import numpy as np
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.cad_engine import CADEngine
from backend.app.models.schemas import WindTunnelParams, TargetFormat

client = TestClient(app)


def test_cad_engine_wind_tunnel_generation():
    # Create sample box
    box = trimesh.creation.box(extents=[10, 10, 10])
    params = WindTunnelParams(
        inlet_factor=2.0,
        outlet_factor=4.0,
        margin_factor=1.5,
        boolean_mode="auto",
        target_format=TargetFormat.STEP
    )
    fluid_domain, tunnel_box = CADEngine.generate_wind_tunnel_domain(box, params)
    
    assert fluid_domain is not None
    assert len(fluid_domain.vertices) > 0
    assert len(fluid_domain.faces) > 0
    assert tunnel_box is not None
    # Check that wind tunnel bounds are strictly larger than model
    assert tunnel_box.extents[0] >= box.extents[0] * (1 + params.inlet_factor + params.outlet_factor - 0.1)


def test_api_wind_tunnel_extraction():
    box = trimesh.creation.box(extents=[10, 10, 10])
    stl_bytes = box.export(file_type="stl")

    response = client.post(
        "/api/v1/wind-tunnel/extract",
        files={"file": ("fan_model.stl", stl_bytes, "application/octet-stream")},
        data={
            "inlet_factor": 2.0,
            "outlet_factor": 5.0,
            "margin_factor": 2.0,
            "boolean_mode": "auto",
            "target_format": "step"
        }
    )

    if response.status_code != 200:
        print("API Response Error:", response.json())
    assert response.status_code == 200
    data = response.json()
    assert "task_id" in data
    assert "download_url" in data
    assert data["filename"].endswith("_fluid_domain.step")
    assert data["fluid_domain_metrics"]["vertices_count"] > 0
