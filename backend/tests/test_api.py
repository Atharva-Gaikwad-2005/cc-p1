import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app_name"] == "DocuMind AI"
    assert "mode" in data


def test_api_config_status():
    response = client.get("/api/config/status")
    assert response.status_code == 200
    data = response.json()
    assert "app_mode" in data
    assert "max_file_size_mb" in data
    assert ".pdf" in data["supported_file_types"]


def test_api_preview_txt():
    content = b"This is a sample document for preview testing with sufficient length."
    files = {"file": ("preview_test.txt", content, "text/plain")}
    response = client.post("/api/documents/preview", files=files)
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "preview_test.txt"
    assert data["file_type"] == "TXT"
    assert data["char_count"] == len(content)
    assert "sample document" in data["full_text"]


def test_api_preview_invalid_format():
    content = b"fake binary"
    files = {"file": ("script.js", content, "application/javascript")}
    response = client.post("/api/documents/preview", files=files)
    assert response.status_code == 400
    assert "Unsupported file format" in response.json()["detail"]


def test_api_summaries_generate_demo():
    payload = {
        "filename": "cloud_guide.txt",
        "text": (
            "Amazon SageMaker is a cloud machine-learning platform that was launched in November 2017. "
            "SageMaker enables developers to build, train, and deploy machine learning models quickly. "
            "It provides a managed environment for every step of the machine learning workflow. "
            "Amazon S3 provides highly durable cloud object storage for training data and model artifacts."
        ),
        "length": "short",
        "format": "bullet_points",
    }
    response = client.post("/api/summaries/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "cloud_guide.txt"
    assert data["length"] == "short"
    assert data["format"] == "bullet_points"
    assert "•" in data["summary_text"]
    assert len(data["key_points"]) > 0
    assert data["saved"] is True
    assert "summary_id" in data

    # Verify summary is now retrievable in history
    hist_resp = client.get("/api/summaries")
    assert hist_resp.status_code == 200
    hist_items = hist_resp.json()
    assert any(h["summary_id"] == data["summary_id"] for h in hist_items)

    # Verify retrieval by ID
    single_resp = client.get(f"/api/summaries/{data['summary_id']}")
    assert single_resp.status_code == 200
    assert single_resp.json()["summary_id"] == data["summary_id"]

    # Verify deletion
    del_resp = client.delete(f"/api/summaries/{data['summary_id']}")
    assert del_resp.status_code == 200
    assert del_resp.json()["success"] is True

    # Ensure 404 on subsequent get
    assert client.get(f"/api/summaries/{data['summary_id']}").status_code == 404
