import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.core.security import _FAILED_LOGIN_ATTEMPTS


@pytest.fixture
def auth_client():
    _FAILED_LOGIN_ATTEMPTS.clear()
    client = TestClient(app)
    res = client.post(
        "/api/v1/admin/auth/login",
        json={"username": settings.ADMIN_USERNAME, "password": settings.ADMIN_INITIAL_PASSWORD},
    )
    assert res.status_code == 200
    csrf = res.json()["csrf_token"]
    client.headers.update({"X-CSRF-Token": csrf})
    return client


def test_admin_dashboard_stats_and_charts(auth_client):
    """Test overview statistics and analytics charts."""
    res_stats = auth_client.get("/api/v1/admin/stats")
    assert res_stats.status_code == 200
    stats = res_stats.json()
    assert stats["total_companies"] >= 8
    assert stats["total_offices"] >= 8
    assert stats["total_jobs"] >= 8

    res_charts = auth_client.get("/api/v1/admin/stats/charts")
    assert res_charts.status_code == 200
    charts = res_charts.json()
    assert len(charts["companies_by_industry"]) > 0
    assert len(charts["jobs_by_status"]) > 0


def test_admin_company_crud_and_record_protection(auth_client):
    """Test company creation, update, verification toggle, and protected deletion."""
    # 1. Create company
    comp_slug = "admin-test-fintech"
    res_create = auth_client.post(
        "/api/v1/admin/companies",
        json={
            "name": "Admin Test FinTech",
            "slug": comp_slug,
            "industry": "FinTech",
            "website": "https://testfintech.example.com",
            "is_verified": False,
        },
    )
    assert res_create.status_code == 200
    comp_id = res_create.json()["id"]

    # 2. Toggle verification
    res_toggle = auth_client.patch(f"/api/v1/admin/companies/{comp_id}/verify")
    assert res_toggle.status_code == 200
    assert res_toggle.json()["is_verified"] is True

    # 3. Add office to company
    res_office = auth_client.post(
        "/api/v1/admin/offices",
        json={
            "company_id": comp_id,
            "locality": "Koramangala",
            "address": "123, 80 Feet Road",
            "postal_code": "560034",
            "latitude": 12.9352,
            "longitude": 77.6245,
        },
    )
    assert res_office.status_code == 200
    office_id = res_office.json()["id"]

    # 4. Attempt to delete company without force -> should be BLOCKED because office exists
    res_del_protected = auth_client.delete(f"/api/v1/admin/companies/{comp_id}")
    assert res_del_protected.status_code == 400
    assert "Protected record" in res_del_protected.json()["detail"]

    # 5. Delete office first, then delete company
    res_del_office = auth_client.delete(f"/api/v1/admin/offices/{office_id}")
    assert res_del_office.status_code == 200

    res_del_comp = auth_client.delete(f"/api/v1/admin/companies/{comp_id}")
    assert res_del_comp.status_code == 200


def test_admin_office_coordinates_validation(auth_client):
    """Test that office coordinates outside Greater Bengaluru are rejected."""
    # 1. Get an existing company
    res_comps = auth_client.get("/api/v1/admin/companies?limit=1")
    comp_id = res_comps.json()["items"][0]["id"]

    # Coordinates in Delhi (28.6139, 77.2090) should be rejected
    res_bad_geo = auth_client.post(
        "/api/v1/admin/offices",
        json={
            "company_id": comp_id,
            "locality": "Delhi NCR",
            "latitude": 28.6139,
            "longitude": 77.2090,
        },
    )
    assert res_bad_geo.status_code == 400
    assert "Greater Bengaluru bounds" in res_bad_geo.json()["detail"]


def test_admin_job_crud_and_safety(auth_client):
    """Test job creation, office assignment check, salary validation, and status change."""
    res_comps = auth_client.get("/api/v1/admin/companies?limit=2")
    comp1_id = res_comps.json()["items"][0]["id"]

    # Salary min > max should fail
    res_bad_salary = auth_client.post(
        "/api/v1/admin/jobs",
        json={
            "company_id": comp1_id,
            "title": "Bad Salary Role",
            "description": "Role with min > max",
            "salary_min": 5000000,
            "salary_max": 2000000,
        },
    )
    assert res_bad_salary.status_code == 400
    assert "Minimum salary cannot exceed maximum salary" in res_bad_salary.json()["detail"]

    # Create valid job
    res_job = auth_client.post(
        "/api/v1/admin/jobs",
        json={
            "company_id": comp1_id,
            "title": "Admin Quality Engineer",
            "description": "Responsible for test automation and reliability.",
            "employment_type": "full-time",
            "salary_min": 1800000,
            "salary_max": 2800000,
            "status": "active",
        },
    )
    assert res_job.status_code == 200
    job_id = res_job.json()["id"]

    # Change status to expired
    res_status = auth_client.patch(
        f"/api/v1/admin/jobs/{job_id}/status",
        json={"status": "expired"},
    )
    assert res_status.status_code == 200
    assert res_status.json()["status"] == "expired"

    # Delete test job
    res_del = auth_client.delete(f"/api/v1/admin/jobs/{job_id}")
    assert res_del.status_code == 200


def test_admin_import_preview_json(auth_client):
    """Test uploading JSON file to preview endpoint."""
    sample_json = """[
        {
            "name": "Import Test Co",
            "website": "https://importtest.example.com",
            "offices": [
                {
                    "locality": "Indiranagar",
                    "latitude": 12.9719,
                    "longitude": 77.6412,
                    "postal_code": "560038"
                }
            ],
            "jobs": [
                {
                    "title": "Import Engineer",
                    "description": "Build pipelines",
                    "application_url": "https://importtest.example.com/jobs/1"
                }
            ]
        }
    ]"""

    files = {"file": ("test_import.json", sample_json.encode("utf-8"), "application/json")}
    res_preview = auth_client.post("/api/v1/admin/imports/preview", files=files)
    assert res_preview.status_code == 200
    data = res_preview.json()
    assert data["total_records"] == 1
    assert data["accepted_count"] == 1
    assert data["rejected_count"] == 0
    assert data["items"][0]["valid"] is True
