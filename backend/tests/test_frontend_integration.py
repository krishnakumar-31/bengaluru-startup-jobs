import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_cors_headers_for_frontend_origins(client):
    """Ensure CORS headers allow Next.js development server origins."""
    headers = {
        "Origin": "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
    }
    response = client.options("/api/v1/jobs", headers=headers)
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:3000"


def test_jobs_api_contract_matches_frontend_expectations(client):
    """Verify that /api/v1/jobs returns paginated data matching frontend ApiJob schema."""
    response = client.get("/api/v1/jobs?page=1&limit=6")
    assert response.status_code == 200
    data = response.json()

    assert "items" in data
    assert "total" in data
    assert "page" in data
    assert "limit" in data
    assert "total_pages" in data
    assert "has_next" in data
    assert "has_prev" in data

    assert data["total"] >= 8
    assert len(data["items"]) == 6
    assert data["has_next"] is True
    assert data["has_prev"] is False

    job = data["items"][0]
    assert "id" in job
    assert "title" in job
    assert "company_id" in job
    assert "company" in job
    assert "office" in job
    assert "sources" in job
    assert "salary_min" in job
    assert "salary_max" in job
    assert "application_url" in job
    assert job["company"]["name"] is not None


def test_jobs_map_api_contract_matches_frontend_expectations(client):
    """Verify that /api/v1/jobs/map returns valid coordinates for all verified startups."""
    response = client.get("/api/v1/jobs/map")
    assert response.status_code == 200
    map_pins = response.json()

    assert len(map_pins) >= 8
    for pin in map_pins:
        assert "id" in pin
        assert "title" in pin
        assert "company_name" in pin
        assert "locality" in pin
        assert "address" in pin
        assert "latitude" in pin
        assert "longitude" in pin

        # Latitude and longitude must fall within Bengaluru bounds
        assert 12.7 <= pin["latitude"] <= 13.3
        assert 77.3 <= pin["longitude"] <= 77.9


def test_company_endpoints_contract_matches_frontend_expectations(client):
    """Verify /api/v1/companies, /api/v1/companies/{id}, and /api/v1/companies/{id}/offices."""
    # List companies
    res_list = client.get("/api/v1/companies?limit=10")
    assert res_list.status_code == 200
    companies_data = res_list.json()
    assert companies_data["total"] >= 8
    assert len(companies_data["items"]) >= 8

    # Detail company
    first_comp = companies_data["items"][0]
    comp_id = first_comp["id"]
    res_detail = client.get(f"/api/v1/companies/{comp_id}")
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["name"] == first_comp["name"]
    assert detail["slug"] == first_comp["slug"]

    # Company offices
    res_offices = client.get(f"/api/v1/companies/{comp_id}/offices")
    assert res_offices.status_code == 200
    offices = res_offices.json()
    assert len(offices) >= 1
    assert offices[0]["company_id"] == comp_id
    assert offices[0]["city"] == "Bengaluru"


def test_job_detail_endpoint_contract(client):
    """Verify /api/v1/jobs/{id} returns complete job response."""
    res_jobs = client.get("/api/v1/jobs?limit=1")
    job_id = res_jobs.json()["items"][0]["id"]

    res_detail = client.get(f"/api/v1/jobs/{job_id}")
    assert res_detail.status_code == 200
    job_detail = res_detail.json()
    assert job_detail["id"] == job_id
    assert job_detail["application_url"].startswith("http")
    assert len(job_detail["sources"]) >= 1
