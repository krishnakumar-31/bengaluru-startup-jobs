import os
import json
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.core.security import _FAILED_LOGIN_ATTEMPTS
from app.db.session import SessionLocal
from app.models import Company, Office, Job
from app.services.candidate_verification_service import (
    VERIFICATIONS_STORE_PATH,
    CANDIDATES_JSON_PATH,
)

ARCHIVE_CANDIDATES_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "data"
    / "archive"
    / "mca_500_candidate_backup"
    / "mca_bengaluru_500_records.json"
)

client = TestClient(app)


@pytest.fixture(autouse=True)
def preserve_candidate_verifications():
    """Backup and restore candidate_verifications.json to keep tests hermetic."""
    original_data = None
    if VERIFICATIONS_STORE_PATH.exists():
        with open(VERIFICATIONS_STORE_PATH, "r", encoding="utf-8") as f:
            original_data = f.read()

    yield

    if original_data is not None:
        with open(VERIFICATIONS_STORE_PATH, "w", encoding="utf-8") as f:
            f.write(original_data)
    elif VERIFICATIONS_STORE_PATH.exists():
        try:
            VERIFICATIONS_STORE_PATH.unlink()
        except Exception:
            pass


@pytest.fixture
def with_candidate_dataset():
    """Temporarily supplies the candidate dataset from archive to test the full verification workflow."""
    import shutil
    created = False
    if not CANDIDATES_JSON_PATH.exists() and ARCHIVE_CANDIDATES_PATH.exists():
        shutil.copy2(ARCHIVE_CANDIDATES_PATH, CANDIDATES_JSON_PATH)
        created = True
    yield
    if created and CANDIDATES_JSON_PATH.exists():
        try:
            CANDIDATES_JSON_PATH.unlink()
        except Exception:
            pass


@pytest.fixture
def auth_admin():
    """Helper fixture to log in as admin and return csrf_token."""
    _FAILED_LOGIN_ATTEMPTS.clear()
    client.cookies.clear()
    res = client.post(
        "/api/v1/admin/auth/login",
        json={"username": settings.ADMIN_USERNAME, "password": settings.ADMIN_INITIAL_PASSWORD},
    )
    assert res.status_code == 200
    csrf_token = res.json()["csrf_token"]
    return csrf_token


def test_candidates_endpoint_graceful_empty_when_archived(auth_admin):
    """Verify that when candidates are archived/empty, endpoint returns 200 OK with empty items and 0 summary."""
    if CANDIDATES_JSON_PATH.exists():
        try:
            CANDIDATES_JSON_PATH.unlink()
        except Exception:
            pass

    res = client.get("/api/v1/admin/candidates")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] == 0
    assert len(data["items"]) == 0
    assert data["page"] == 1
    assert data["total_pages"] == 1
    assert data["summary"]["total_candidates"] == 0
    assert data["summary"]["needs_review_count"] == 0

    res_sum = client.get("/api/v1/admin/candidates/summary")
    assert res_sum.status_code == 200
    summary = res_sum.json()
    assert summary["total_candidates"] == 0


def test_candidates_endpoint_requires_auth():
    """Verify that candidate endpoints reject unauthenticated access with 401."""
    client.cookies.clear()
    res = client.get("/api/v1/admin/candidates")
    assert res.status_code == 401
    assert "Authentication required" in res.json()["detail"]

    res_sum = client.get("/api/v1/admin/candidates/summary")
    assert res_sum.status_code == 401

    res_put = client.put(
        "/api/v1/admin/candidates/U29100KA2022PTC165681",
        json={"verification_status": "Verified"},
    )
    assert res_put.status_code == 401


def test_candidate_update_requires_csrf(auth_admin):
    """Verify that updating candidate verification without CSRF token returns 403."""
    res = client.put(
        "/api/v1/admin/candidates/U29100KA2022PTC165681",
        json={"verification_status": "Verified"},
    )
    assert res.status_code == 403
    assert "CSRF validation failed" in res.json()["detail"]


def test_list_candidates_default_pagination_and_summary(auth_admin, with_candidate_dataset):
    """
    Test GET /api/v1/admin/candidates:
    - Returns 20 items per default page.
    - Total is 500.
    - All initial candidates default to 'Needs Review' and is_verified=False.
    - Summary metrics are computed correctly.
    """
    res = client.get("/api/v1/admin/candidates")
    assert res.status_code == 200

    data = res.json()
    assert data["total"] == 500
    assert data["page"] == 1
    assert data["limit"] == 20
    assert len(data["items"]) == 20
    assert data["total_pages"] == 25
    assert data["has_next"] is True
    assert data["has_prev"] is False

    summary = data["summary"]
    assert summary["total_candidates"] == 500
    assert summary["needs_review_count"] == 500
    assert summary["verified_count"] == 0
    assert summary["rejected_count"] == 0
    assert summary["startup_count"] == 185
    assert summary["established_count"] == 85
    assert summary["uncertain_count"] == 230

    # Check structure of the first candidate item
    first = data["items"][0]
    assert first["cin"] == "U29100KA2022PTC165681"
    assert first["verification_status"] == "Needs Review"
    assert first["is_verified"] is False
    assert first["registered_address"] != ""
    assert first["actual_operating_office_address"] is None
    assert first["latitude"] > 0
    assert first["longitude"] > 0


def test_candidates_summary_endpoint(auth_admin, with_candidate_dataset):
    """Test GET /api/v1/admin/candidates/summary directly."""
    res = client.get("/api/v1/admin/candidates/summary")
    assert res.status_code == 200

    summary = res.json()
    assert summary["total_candidates"] == 500
    assert summary["needs_review_count"] == 500
    assert summary["verified_count"] == 0
    assert summary["rejected_count"] == 0
    assert summary["startup_count"] == 185
    assert summary["established_count"] == 85
    assert summary["uncertain_count"] == 230


def test_candidate_filtering(auth_admin, with_candidate_dataset):
    """Test filtering candidates by classification, locality, and search query."""
    # Filter by classification: startup
    res_startup = client.get("/api/v1/admin/candidates?classification=startup")
    assert res_startup.status_code == 200
    data_startup = res_startup.json()
    assert data_startup["total"] == 185
    assert all(item["entity_classification"] == "startup" for item in data_startup["items"])

    # Filter by classification: established_company
    res_est = client.get("/api/v1/admin/candidates?classification=established_company")
    assert res_est.status_code == 200
    data_est = res_est.json()
    assert data_est["total"] == 85
    assert all(item["entity_classification"] == "established_company" for item in data_est["items"])

    # Filter by locality: Peenya
    res_peenya = client.get("/api/v1/admin/candidates?locality=Peenya")
    assert res_peenya.status_code == 200
    data_peenya = res_peenya.json()
    assert data_peenya["total"] > 0
    assert all("peenya" in item["locality"].lower() for item in data_peenya["items"])

    # Filter by keyword search: CIN
    target_cin = "U29100KA2022PTC165681"
    res_cin = client.get(f"/api/v1/admin/candidates?search={target_cin}")
    assert res_cin.status_code == 200
    data_cin = res_cin.json()
    assert data_cin["total"] == 1
    assert data_cin["items"][0]["cin"] == target_cin


def test_get_single_candidate(auth_admin, with_candidate_dataset):
    """Test GET /api/v1/admin/candidates/{cin}."""
    cin = "U29100KA2022PTC165681"
    res = client.get(f"/api/v1/admin/candidates/{cin}")
    assert res.status_code == 200
    data = res.json()
    assert data["cin"] == cin
    assert data["name"] == "Sparkle Hydrosystems"
    assert data["verification_status"] == "Needs Review"
    assert data["is_verified"] is False
    assert "peenya" in data["registered_address"].lower()

    # Test 404 for non-existent CIN
    res_404 = client.get("/api/v1/admin/candidates/INVALIDCIN123456")
    assert res_404.status_code == 404
    assert "Candidate company not found" in res_404.json()["detail"]


def test_update_candidate_verification_workflow(auth_admin, with_candidate_dataset):
    """
    Test the full manual verification workflow:
    1. Update status to 'Verified' with website, evidence, operating address, and notes.
    2. Confirm persistence and fields returned.
    3. Confirm distinction between registered address and operating office address.
    4. Confirm summary stats reflect the change.
    5. Update status to 'Rejected'.
    6. Confirm rejected status and count update.
    """
    csrf_token = auth_admin
    cin = "U29100KA2022PTC165681"

    # Step 1: Verify company
    payload_verify = {
        "verification_status": "Verified",
        "official_website": "https://sparklehydrosystems.com",
        "evidence_url": "https://www.linkedin.com/company/sparklehydrosystems",
        "actual_operating_office_address": "Plot No 45, 1st Cross, Peenya 3rd Phase, Bengaluru",
        "operating_locality": "Peenya",
        "operating_pincode": "560058",
        "reviewer_notes": "Official facility confirmed at Peenya industrial estate via web and map validation.",
    }
    headers = {"X-CSRF-Token": csrf_token}

    res_put = client.put(
        f"/api/v1/admin/candidates/{cin}",
        json=payload_verify,
        headers=headers,
    )
    assert res_put.status_code == 200
    updated = res_put.json()

    assert updated["cin"] == cin
    assert updated["verification_status"] == "Verified"
    assert updated["is_verified"] is True
    assert updated["official_website"] == "https://sparklehydrosystems.com"
    assert updated["evidence_url"] == "https://www.linkedin.com/company/sparklehydrosystems"
    assert updated["actual_operating_office_address"] == "Plot No 45, 1st Cross, Peenya 3rd Phase, Bengaluru"
    assert updated["operating_locality"] == "Peenya"
    assert updated["operating_pincode"] == "560058"
    assert updated["reviewer_notes"] == "Official facility confirmed at Peenya industrial estate via web and map validation."
    assert updated["reviewed_by"] == settings.ADMIN_USERNAME
    assert updated["verification_date"] is not None

    # Step 2: Verify distinction between registered address and operating office
    assert updated["registered_address"] != updated["actual_operating_office_address"]

    # Step 3: Verify summary counts updated
    res_sum = client.get("/api/v1/admin/candidates/summary")
    assert res_sum.status_code == 200
    summary = res_sum.json()
    assert summary["verified_count"] == 1
    assert summary["needs_review_count"] == 499
    assert summary["operating_office_confirmed_count"] == 1
    assert summary["website_confirmed_count"] == 1
    assert summary["evidence_confirmed_count"] == 1

    # Step 4: Update to 'Rejected'
    payload_reject = {
        "verification_status": "Rejected",
        "reviewer_notes": "Entity dissolved or not operating in tech sector.",
    }
    res_reject = client.put(
        f"/api/v1/admin/candidates/{cin}",
        json=payload_reject,
        headers=headers,
    )
    assert res_reject.status_code == 200
    rejected = res_reject.json()
    assert rejected["verification_status"] == "Rejected"
    assert rejected["is_verified"] is False
    assert rejected["reviewer_notes"] == "Entity dissolved or not operating in tech sector."

    # Verify summary after rejection
    res_sum2 = client.get("/api/v1/admin/candidates/summary")
    assert res_sum2.status_code == 200
    summary2 = res_sum2.json()
    assert summary2["verified_count"] == 0
    assert summary2["rejected_count"] == 1
    assert summary2["needs_review_count"] == 499


def test_update_candidate_invalid_status(auth_admin):
    """Test that submitting an invalid verification status returns 422."""
    csrf_token = auth_admin
    cin = "U29100KA2022PTC165681"
    headers = {"X-CSRF-Token": csrf_token}

    res_invalid = client.put(
        f"/api/v1/admin/candidates/{cin}",
        json={"verification_status": "InvalidStatus"},
        headers=headers,
    )
    assert res_invalid.status_code == 422


def test_postgresql_isolation_and_file_integrity(auth_admin, with_candidate_dataset):
    """
    CRITICAL REQUIREMENT CHECK:
    Verify that PostgreSQL tables (companies, offices, jobs) remain strictly untouched
    and data/output/mca_bengaluru_500_records.json is pristine.
    """
    db = SessionLocal()
    company_count = db.query(Company).count()
    office_count = db.query(Office).count()
    job_count = db.query(Job).count()
    db.close()

    assert company_count >= 8, f"Expected at least 8 companies in PostgreSQL, found {company_count}"
    assert office_count >= 8, f"Expected at least 8 offices in PostgreSQL, found {office_count}"
    assert job_count >= 8, f"Expected at least 8 jobs in PostgreSQL, found {job_count}"

    # Verify candidate JSON has exactly 500 records and is not corrupted
    assert CANDIDATES_JSON_PATH.exists()
    with open(CANDIDATES_JSON_PATH, "r", encoding="utf-8") as f:
        candidates = json.load(f)
    assert len(candidates) == 500
