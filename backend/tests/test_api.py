import pytest
import io
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.utils.sample_generator import Sample3DGenerator

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "step" in data["supported_formats"]
    assert "stl" in data["supported_formats"]


def test_inspect_endpoint():
    mesh = Sample3DGenerator.create_defective_mesh_with_holes()
    stl_bytes = mesh.export(file_type="stl")
    
    response = client.post(
        "/api/v1/inspect",
        files={"file": ("defective.stl", io.BytesIO(stl_bytes), "model/stl")},
        data={"lang": "zh-TW"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert "defects" in data
    assert "health_score" in data
    assert data["file_format"] == "stl"


def test_convert_and_task_flow():
    mesh = Sample3DGenerator.create_defective_mesh_with_holes()
    stl_bytes = mesh.export(file_type="stl")

    # Start sync conversion
    response = client.post(
        "/api/v1/convert",
        files={"file": ("test_sample.stl", io.BytesIO(stl_bytes), "model/stl")},
        data={
            "target_format": "glb",
            "auto_fill_holes": "true",
            "fix_non_manifold": "true",
            "sync": "true",
            "language": "en"
        }
    )
    assert response.status_code == 200
    task_data = response.json()
    task_id = task_data["task_id"]
    assert task_data["status"] == "completed"
    assert task_data["report"] is not None
    assert task_data["report"]["watertight_achieved"] is True

    # Query task status
    status_res = client.get(f"/api/v1/tasks/{task_id}")
    assert status_res.status_code == 200
    assert status_res.json()["status"] == "completed"

    # Download converted file
    dl_res = client.get(f"/api/v1/tasks/{task_id}/download")
    assert dl_res.status_code == 200
    assert len(dl_res.content) > 0

    # Stream preview GLB
    prev_res = client.get(f"/api/v1/tasks/{task_id}/preview")
    assert prev_res.status_code == 200
    assert len(prev_res.content) > 0
