from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health_check_endpoint():
    """Verify that the health check endpoint returns 200 OK and valid JSON

    without requiring an active PostgreSQL database connection.
    """
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "app_name" in data
    assert "version" in data
    assert "environment" in data


def test_root_endpoint():
    """Verify that the root endpoint returns a helpful index response."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "health" in data
    assert data["health"] == "/api/v1/health"
