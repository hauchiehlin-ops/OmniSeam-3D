import io
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.utils.sample_generator import Sample3DGenerator

client = TestClient(app)


def test_create_and_get_ar_session_with_file():
    mesh = Sample3DGenerator.create_defective_mesh_with_holes()
    stl_bytes = mesh.export(file_type="stl")

    # Create session with STL upload
    response = client.post(
        "/api/v1/ar/session",
        files={"file": ("Fan-2.stl", io.BytesIO(stl_bytes), "application/octet-stream")},
        data={"filename": "Fan-2.stl"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert data["session_id"].startswith("ar_")
    assert data["filename"] == "Fan-2.stl"
    assert "glb_url" in data

    session_id = data["session_id"]

    # Query session info
    info_resp = client.get(f"/api/v1/ar/{session_id}")
    assert info_resp.status_code == 200
    info_data = info_resp.json()
    assert info_data["session_id"] == session_id
    assert info_data["filename"] == "Fan-2.stl"

    # Stream GLB
    glb_resp = client.get(f"/api/v1/ar/{session_id}/model.glb")
    assert glb_resp.status_code == 200
    assert len(glb_resp.content) > 0
    assert glb_resp.headers["content-type"].startswith("model/gltf-binary")


def test_ar_session_not_found():
    response = client.get("/api/v1/ar/ar_nonexistent123")
    assert response.status_code == 404
