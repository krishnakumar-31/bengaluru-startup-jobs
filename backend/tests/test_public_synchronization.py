import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import SessionLocal
from app.models import Company, Office, Job

client = TestClient(app)


def test_public_statistics_synchronization():
    """Verify GET /api/v1/stats/public reflects the live database with Sarvam AI included."""
    db = SessionLocal()
    expected_companies = db.query(Company).filter(Company.is_verified == True).count()
    expected_offices = (
        db.query(Office)
        .join(Company, Office.company_id == Company.id)
        .filter(Company.is_verified == True)
        .count()
    )
    expected_jobs = db.query(Job).filter(Job.status == "active").count()
    db.close()

    res = client.get("/api/v1/stats/public")
    assert res.status_code == 200
    assert "no-cache" in res.headers.get("cache-control", "")
    data = res.json()

    # Exact expected metrics matched against live PostgreSQL
    assert data["total_approved_companies"] == expected_companies
    assert data["total_office_locations"] == expected_offices
    assert data["active_job_openings"] == expected_jobs
    assert data["total_approved_companies"] >= 9
    assert data["active_job_openings"] >= 10


def test_public_job_search_synchronization():
    """Verify GET /api/v1/jobs returns roles including both Sarvam AI jobs."""
    res = client.get("/api/v1/jobs?limit=50")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 10

    # Search specifically for Sarvam AI
    res_sarvam = client.get("/api/v1/jobs?company=Sarvam+AI")
    assert res_sarvam.status_code == 200
    sarvam_jobs = res_sarvam.json()["items"]
    assert len(sarvam_jobs) == 2

    job_titles = {j["title"] for j in sarvam_jobs}
    assert "SDE2 - API Platform" in job_titles
    assert "Platform Engineer - AI Infrastructure" in job_titles

    for j in sarvam_jobs:
        assert j["company"]["name"] == "Sarvam AI"
        assert j["office"]["locality"] == "Indiranagar"
        assert j["status"] == "active"


def test_company_directory_synchronization():
    """Verify GET /api/v1/companies includes Sarvam AI as an approved entity."""
    res = client.get("/api/v1/companies?limit=50")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 9

    company_names = [c["name"] for c in data["items"]]
    assert "Sarvam AI" in company_names
    assert "CRED" in company_names

    sarvam = next(c for c in data["items"] if c["name"] == "Sarvam AI")
    assert sarvam["is_verified"] is True
    assert sarvam["slug"] == "sarvam-ai"


def test_public_map_locations_synchronization():
    """Verify GET /api/v1/map/locations returns verified locations with Greater Bengaluru coordinates."""
    res = client.get("/api/v1/map/locations")
    assert res.status_code == 200
    assert "no-cache" in res.headers.get("cache-control", "")
    locations = res.json()
    assert len(locations) >= 9

    company_names = {l["company_name"] for l in locations}
    assert "Sarvam AI" in company_names
    assert "CRED" in company_names
    assert "Zerodha" in company_names

    # Check Greater Bengaluru boundaries
    for loc in locations:
        assert 12.70 <= loc["latitude"] <= 13.25
        assert 77.35 <= loc["longitude"] <= 77.85
        assert loc["is_verified"] is True


def test_indiranagar_corridor_filter_and_marker_isolation():
    """Verify Indiranagar corridor filter returns CRED and Sarvam AI with distinct popups."""
    res = client.get("/api/v1/map/locations?locality=Indiranagar")
    assert res.status_code == 200
    locations = res.json()
    assert len(locations) >= 2

    by_company = {l["company_name"]: l for l in locations}
    assert "Sarvam AI" in by_company
    assert "CRED" in by_company

    sarvam = by_company["Sarvam AI"]
    cred = by_company["CRED"]

    # Verify separate office IDs and company IDs
    assert sarvam["office_id"] != cred["office_id"]
    assert sarvam["company_id"] != cred["company_id"]

    # Verify distinct coordinates
    assert (sarvam["latitude"], sarvam["longitude"]) != (cred["latitude"], cred["longitude"])
    assert 12.978 <= sarvam["latitude"] <= 12.980
    assert 77.643 <= sarvam["longitude"] <= 77.646

    # Verify Sarvam AI popup payload
    assert sarvam["company_name"] == "Sarvam AI"
    assert sarvam["locality"] == "Indiranagar"
    assert sarvam["has_active_vacancies"] is True
    assert sarvam["active_jobs_count"] == 2
    assert sarvam["total_vacancies"] == 2
    sarvam_titles = {j["title"] for j in sarvam["jobs"]}
    assert "SDE2 - API Platform" in sarvam_titles
    assert "Platform Engineer - AI Infrastructure" in sarvam_titles

    # Verify CRED popup payload
    assert cred["company_name"] == "CRED"
    assert cred["locality"] == "Indiranagar"
    assert cred["has_active_vacancies"] is True
    assert cred["active_jobs_count"] == 1
    assert cred["total_vacancies"] == 1
    cred_titles = {j["title"] for j in cred["jobs"]}
    assert "Frontend Engineer - Design Systems" in cred_titles
