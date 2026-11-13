from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app.main import app

pytest.importorskip("cascadio")

TEST_STEP = Path(__file__).resolve().parents[2] / "docs" / "app-store" / "test-files" / "review_test_plate.step"
client = TestClient(app)


def test_parametric_step_converts_to_watertight_mm_mesh():
    """The App Review test plate (60x40x10 mm, 2 holes, 4 fillets) converts without FreeCAD."""
    with open(TEST_STEP, "rb") as f:
        r = client.post(
            "/api/v1/convert",
            files={"file": ("review_test_plate.step", f, "application/octet-stream")},
            data={"target_format": "stl", "sync": "true", "language": "en"},
        )
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "completed", body.get("error")
    report = body["report"]
    assert report["watertight_achieved"] is True
    # Volume in mm^3: 60*40*10 - two Ø8 holes - four R5 fillets ≈ 22 780
    assert report["repaired_metrics"]["volume"] == pytest.approx(22780, rel=0.02)
    size = report["repaired_metrics"]["bounding_box"]["size"]
    assert sorted(round(v) for v in size) == [10, 40, 60]
