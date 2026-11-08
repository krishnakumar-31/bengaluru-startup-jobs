import io
import json
import pytest
from pathlib import Path
from fastapi.testclient import TestClient

from app.main import app
from app.core.config import settings
from app.core.security import _FAILED_LOGIN_ATTEMPTS
from app.db.session import SessionLocal
from app.models import Company, Office, Job
from app.services.candidate_verification_service import VERIFICATIONS_STORE_PATH, CANDIDATES_JSON_PATH
from app.services.unified_import_service import UnifiedImportService, UNIFIED_CSV_COLUMNS

ARCHIVE_CANDIDATES_PATH = (
    Path(__file__).resolve().parent.parent.parent
    / "data"
    / "archive"
    / "mca_500_candidate_backup"
    / "mca_bengaluru_500_records.json"
)

client = TestClient(app)


@pytest.fixture
def with_candidate_dataset():
    """Temporarily supplies the candidate dataset from archive for promotion testing."""
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
def auth_admin():
    """Helper fixture to log in as admin and return csrf_token."""
    _FAILED_LOGIN_ATTEMPTS.clear()
    client.cookies.clear()
    res = client.post(
        "/api/v1/admin/auth/login",
        json={"username": settings.ADMIN_USERNAME, "password": settings.ADMIN_INITIAL_PASSWORD},
    )
    assert res.status_code == 200
    return res.json()["csrf_token"]


def test_import_template_endpoint(auth_admin):
    """Verify standard CSV template endpoint returns exact 35 columns."""
    res = client.get("/api/v1/admin/imports/template")
    assert res.status_code == 200
    assert "text/csv" in res.headers["content-type"]
    assert 'filename="startup_jobs_import_template.csv"' in res.headers.get("content-disposition", "")
    
    first_line = res.text.strip().split("\n")[0].strip()
    headers = [h.strip() for h in first_line.split(",")]
    assert len(headers) == 35
    assert headers == UNIFIED_CSV_COLUMNS
    assert "companyName" in headers
    assert "isHeadquarters" in headers
    assert "vacancies" in headers
    assert "jobStatus" in headers


def test_public_stats_endpoint():
    """Verify public stats endpoint returns database-backed statistics."""
    res = client.get("/api/v1/stats/public")
    assert res.status_code == 200
    data = res.json()
    assert "total_approved_companies" in data
    assert "total_office_locations" in data
    assert "active_job_openings" in data
    assert "total_vacancies" in data
    assert data["total_approved_companies"] >= 8
    assert data["total_office_locations"] >= 8
    assert data["active_job_openings"] >= 8
    assert data["total_vacancies"] >= 8


def test_public_map_locations_endpoint():
    """Verify public map locations endpoint returns approved offices with vacancies details."""
    res = client.get("/api/v1/map/locations")
    assert res.status_code == 200
    locations = res.json()
    assert isinstance(locations, list)
    assert len(locations) >= 8

    for loc in locations:
        assert "office_id" in loc
        assert "company_name" in loc
        assert "latitude" in loc
        assert "longitude" in loc
        assert "has_active_vacancies" in loc
        assert "jobs" in loc
        assert loc["is_verified"] is True
        # Verify coordinates are in Greater Bengaluru
        assert 12.70 <= loc["latitude"] <= 13.25
        assert 77.35 <= loc["longitude"] <= 77.85


def test_unified_csv_formula_injection_defense():
    """Verify formula injection characters are escaped with single quotes."""
    assert UnifiedImportService.sanitize_csv_value("=cmd|'/C calc'!A0") == "'=cmd|'/C calc'!A0"
    assert UnifiedImportService.sanitize_csv_value("+12345") == "'+12345"
    assert UnifiedImportService.sanitize_csv_value("-100") == "'-100"
    assert UnifiedImportService.sanitize_csv_value("@SUM(A1:A10)") == "'@SUM(A1:A10)"
    assert UnifiedImportService.sanitize_csv_value("Normal text") == "Normal text"


def test_unified_csv_preview_and_confirm(auth_admin):
    """Verify previewing and ingesting a standard CSV with reuse and Greater Bengaluru check."""
    csv_content = (
        ",".join(UNIFIED_CSV_COLUMNS) + "\n"
        "Test Ingestion Tech,test-ingestion-tech,U72900KA2026PTC999001,https://testingestion.tech,careers@testingestion.tech,+91-80-11223344,AI / ML,Innovative AI startup in Koramangala,https://testingestion.tech/logo.png,Main Campus,100 Feet Rd 4th Block,Koramangala,Bengaluru,Karnataka,560034,12.9352,77.6245,true,Lead AI Engineer,lead-ai-engineer,Build cutting edge LLMs,\"Python, PyTorch, FastAPI\",3,7,full-time,in-office,2,3000000,4500000,INR,https://testingestion.tech/apply,https://linkedin.com/jobs/999,2026-11-01,2026-12-01,active\n"
        "Test Ingestion Tech,test-ingestion-tech,U72900KA2026PTC999001,https://testingestion.tech,careers@testingestion.tech,+91-80-11223344,AI / ML,Innovative AI startup in Koramangala,https://testingestion.tech/logo.png,Indiranagar Branch,100 Feet Road,Indiranagar,Bengaluru,Karnataka,560038,12.9716,77.6412,false,MLOps Specialist,mlops-specialist,Deploy models to Kubernetes,\"Kubernetes, Docker, Python\",2,5,full-time,hybrid,1,2000000,3200000,INR,https://testingestion.tech/apply-mlops,https://linkedin.com/jobs/998,2026-11-01,2026-12-01,active\n"
    )

    # 1. Preview
    files = {"file": ("test_import.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    res = client.post(
        "/api/v1/admin/imports/preview",
        files=files,
        headers={"X-CSRF-Token": auth_admin},
    )
    assert res.status_code == 200
    preview = res.json()
    assert preview["total_records"] == 2
    assert preview["accepted_count"] == 2
    assert preview["rejected_count"] == 0
    assert preview["new_companies_count"] == 1
    assert preview["new_offices_count"] == 2
    assert preview["new_jobs_count"] == 2
    assert preview["items"][0]["is_duplicate_company"] is False
    assert preview["items"][1]["is_duplicate_company"] is True
    assert preview["raw_accepted_json"] is not None

    # 2. Confirm ingestion
    res_confirm = client.post(
        "/api/v1/admin/imports/confirm",
        json={"raw_accepted_json": preview["raw_accepted_json"]},
        headers={"X-CSRF-Token": auth_admin},
    )
    assert res_confirm.status_code == 200
    result = res_confirm.json()
    assert result["companies_created"] == 1
    assert result["offices_created"] == 2
    assert result["jobs_created"] == 2

    # Clean up test entities
    db = SessionLocal()
    try:
        comp = db.query(Company).filter(Company.slug == "test-ingestion-tech").first()
        if comp:
            db.query(Job).filter(Job.company_id == comp.id).delete()
            db.query(Office).filter(Office.company_id == comp.id).delete()
            db.delete(comp)
            db.commit()
    finally:
        db.close()


def test_unified_csv_outside_bengaluru_rejected(auth_admin):
    """Verify records with coordinates outside Greater Bengaluru bounds are flagged with issues."""
    csv_content = (
        ",".join(UNIFIED_CSV_COLUMNS) + "\n"
        "Mumbai Branch Corp,mumbai-branch-corp,,,,,,,,,123 Marine Drive,Nariman Point,Mumbai,Maharashtra,400021,18.9220,72.8347,true,,,,,,,,,,,,,,,\n"
    )
    files = {"file": ("test_mumbai.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}
    res = client.post(
        "/api/v1/admin/imports/preview",
        files=files,
        headers={"X-CSRF-Token": auth_admin},
    )
    assert res.status_code == 200
    preview = res.json()
    assert preview["total_records"] == 1
    assert preview["rejected_count"] == 1
    assert preview["accepted_count"] == 0
    item = preview["items"][0]
    assert item["valid"] is False
    assert any("outside the Bengaluru metropolitan boundary" in issue or "Office city must be Bengaluru" in issue for issue in item["issues"])


def test_candidate_promotion_workflow(auth_admin, with_candidate_dataset):
    """Verify promoting a verified MCA candidate creates company and office in PostgreSQL."""
    # Read candidates list to find an existing candidate CIN
    res = client.get("/api/v1/admin/candidates?limit=5", headers={"X-CSRF-Token": auth_admin})
    assert res.status_code == 200
    candidates = res.json()["items"]
    assert len(candidates) > 0
    test_candidate = candidates[0]
    cin = test_candidate["cin"]

    # First ensure candidate is marked Verified
    update_res = client.put(
        f"/api/v1/admin/candidates/{cin}",
        json={
            "verification_status": "Verified",
            "official_website": "https://verifiedstartup.in",
            "actual_operating_office_address": "Indiranagar 100 Feet Road, Bengaluru",
            "operating_locality": "Indiranagar",
            "operating_pincode": "560038",
            "reviewer_notes": "Promoting verified startup in test",
        },
        headers={"X-CSRF-Token": auth_admin},
    )
    assert update_res.status_code == 200

    # Promote to PostgreSQL
    promote_res = client.post(
        f"/api/v1/admin/candidates/{cin}/promote",
        headers={"X-CSRF-Token": auth_admin},
    )
    assert promote_res.status_code == 200
    promote_data = promote_res.json()
    assert "company_id" in promote_data
    assert "office_id" in promote_data

    # Verify company exists in database
    db = SessionLocal()
    try:
        comp = db.query(Company).filter(Company.cin == cin).first()
        assert comp is not None
        assert comp.is_verified is True
        office = db.query(Office).filter(Office.company_id == comp.id).first()
        assert office is not None
        assert office.locality == "Indiranagar"

        # Promoting again should return existing records without error
        promote_again = client.post(
            f"/api/v1/admin/candidates/{cin}/promote",
            headers={"X-CSRF-Token": auth_admin},
        )
        assert promote_again.status_code == 200
        assert promote_again.json()["company_id"] == comp.id

        # Clean up created company and office
        db.query(Job).filter(Job.company_id == comp.id).delete()
        db.query(Office).filter(Office.company_id == comp.id).delete()
        db.delete(comp)
        db.commit()
    finally:
        db.close()


def test_candidates_exclude_rejected_filter(auth_admin):
    """Verify that exclude_rejected filter excludes Rejected candidates from active queue."""
    # Read candidates with exclude_rejected=true
    res = client.get(
        "/api/v1/admin/candidates?exclude_rejected=true&limit=50",
        headers={"X-CSRF-Token": auth_admin},
    )
    assert res.status_code == 200
    items = res.json()["items"]
    for item in items:
        assert item["verification_status"] != "Rejected"


def test_unified_csv_utf8_bom(auth_admin):
    """Verify CSV encoded with UTF-8 BOM is parsed without 'Missing expected CSV header(s): companyName' error."""
    csv_str = (
        ",".join(UNIFIED_CSV_COLUMNS) + "\n"
        "BOM Tech,bom-tech,U72900KA2026PTC888001,https://bomtech.in,contact@bomtech.in,+91-80-88888888,Software,BOM handling tech,,BOM HQ,12 80ft Rd,Koramangala,Bengaluru,Karnataka,560034,12.9345,77.6258,true,BOM Engineer,bom-eng,Build resilient parsers,\"Python, UTF-8\",2,5,full-time,in-office,1,1500000,2500000,INR,https://bomtech.in/jobs/1,,2026-11-01,2026-12-31,active\n"
    )
    # Encode with utf-8-sig (prepends \xef\xbb\xbf)
    bom_bytes = csv_str.encode("utf-8-sig")
    assert bom_bytes.startswith(b"\xef\xbb\xbf")

    files = {"file": ("test_bom.csv", io.BytesIO(bom_bytes), "text/csv")}
    res = client.post(
        "/api/v1/admin/imports/preview",
        files=files,
        headers={"X-CSRF-Token": auth_admin},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_records"] == 1
    assert data["accepted_count"] == 1
    assert data["rejected_count"] == 0
    assert data["items"][0]["valid"] is True
    assert data["items"][0]["company_name"] == "BOM Tech"


def test_unified_csv_whitespace_headers(auth_admin):
    """Verify headers with whitespace and zero-width characters normalize safely."""
    padded_headers = [f"  {h} \t" for h in UNIFIED_CSV_COLUMNS]
    # Add a zero-width character to the first header
    padded_headers[0] = f"\u200b  {UNIFIED_CSV_COLUMNS[0]}  "
    csv_str = (
        ",".join(padded_headers) + "\n"
        "Whitespace Tech,whitespace-tech,,,,,,,,,Koramangala,Koramangala,Bengaluru,Karnataka,560034,12.9345,77.6258,true,,,,,,,,,,,,,,,\n"
    )
    files = {"file": ("test_ws.csv", io.BytesIO(csv_str.encode("utf-8")), "text/csv")}
    res = client.post(
        "/api/v1/admin/imports/preview",
        files=files,
        headers={"X-CSRF-Token": auth_admin},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_records"] == 1
    assert data["accepted_count"] == 1
    assert data["rejected_count"] == 0
    assert data["items"][0]["valid"] is True
    assert data["items"][0]["company_name"] == "Whitespace Tech"


def test_unified_csv_semicolon_delimiter(auth_admin):
    """Verify semicolon-delimited CSV is automatically detected and parsed."""
    csv_str = (
        ";".join(UNIFIED_CSV_COLUMNS) + "\n"
        "Semicolon Corp;semicolon-corp;;https://semicolon.io;careers@semicolon.io;;Fintech;Modern payments;;Campus 1;Outer Ring Road;Bellandur;Bengaluru;Karnataka;560103;12.9260;77.6762;true;Backend Lead;semicolon-backend;Scale APIs;Go,Postgres,Kafka;4;8;full-time;hybrid;2;2500000;4000000;INR;https://semicolon.io/apply;;2026-11-01;2026-12-31;active\n"
    )
    files = {"file": ("test_semicolon.csv", io.BytesIO(csv_str.encode("utf-8")), "text/csv")}
    res = client.post(
        "/api/v1/admin/imports/preview",
        files=files,
        headers={"X-CSRF-Token": auth_admin},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_records"] == 1
    assert data["accepted_count"] == 1
    assert data["rejected_count"] == 0
    assert data["items"][0]["valid"] is True
    assert data["items"][0]["company_name"] == "Semicolon Corp"
    assert data["items"][0]["job_title"] == "Backend Lead"


def test_unified_csv_tab_delimiter(auth_admin):
    """Verify tab-delimited (TSV) file is automatically detected and parsed."""
    tsv_str = (
        "\t".join(UNIFIED_CSV_COLUMNS) + "\n"
        "Tab Solutions\ttab-solutions\t\thttps://tabsol.in\tjobs@tabsol.in\t\tAnalytics\tData intelligence\t\tHQ\tHSR 5th Sector\tHSR Layout\tBengaluru\tKarnataka\t560102\t12.9121\t77.6446\ttrue\tData Architect\ttab-data-arch\tDesign data lakes\tPython,Spark,Snowflake\t5\t10\tfull-time\tin-office\t1\t3500000\t5500000\tINR\thttps://tabsol.in/apply\t\t2026-11-01\t2026-12-31\tactive\n"
    )
    files = {"file": ("test_tabs.tsv", io.BytesIO(tsv_str.encode("utf-8")), "text/csv")}
    res = client.post(
        "/api/v1/admin/imports/preview",
        files=files,
        headers={"X-CSRF-Token": auth_admin},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_records"] == 1
    assert data["accepted_count"] == 1
    assert data["rejected_count"] == 0
    assert data["items"][0]["valid"] is True
    assert data["items"][0]["company_name"] == "Tab Solutions"
    assert data["items"][0]["job_title"] == "Data Architect"


def test_unified_csv_quoted_multiline_and_commas(auth_admin):
    """Verify CSV with quoted multiline strings and internal commas is parsed accurately."""
    import csv
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(UNIFIED_CSV_COLUMNS)
    writer.writerow([
        "MultiLine Inc", "multiline-inc", "U72900KA2026PTC777001", "https://multiline.com",
        "jobs@multiline.com", "+91-80-77777777", "Enterprise Software",
        "Company with\nmultiline description, and commas.",
        "https://multiline.com/logo.png",
        "Office 1", "Indiranagar 100ft Rd", "Indiranagar", "Bengaluru", "Karnataka", "560038",
        "12.9716", "77.6412", "true",
        "Staff Engineer", "staff-eng",
        "Lead architecture for distributed systems,\nhandling 100k rps.",
        "Go, Distributed Systems, Kubernetes", "5", "10",
        "full-time", "remote", "1", "4000000", "6000000", "INR",
        "https://multiline.com/jobs/staff", "https://linkedin.com/jobs/111",
        "2026-11-01", "2026-12-31", "active"
    ])
    multiline_csv = out.getvalue()
    files = {"file": ("test_multiline.csv", io.BytesIO(multiline_csv.encode("utf-8")), "text/csv")}
    res = client.post(
        "/api/v1/admin/imports/preview",
        files=files,
        headers={"X-CSRF-Token": auth_admin},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_records"] == 1
    assert data["accepted_count"] == 1
    assert data["rejected_count"] == 0
    assert data["items"][0]["valid"] is True
    assert data["items"][0]["company_name"] == "MultiLine Inc"

    # Verify JSON accepted records preserved multiline description
    accepted_records = json.loads(data["raw_accepted_json"])
    assert len(accepted_records) == 1
    comp_desc = accepted_records[0]["company"]["description"]
    assert "multiline description, and commas." in comp_desc
    job_desc = accepted_records[0]["job"]["description"]
    assert "handling 100k rps." in job_desc


def test_unified_csv_missing_header_error_reporting(auth_admin):
    """Verify genuinely missing headers report clear and exact error messages."""
    headers_missing_two = [h for h in UNIFIED_CSV_COLUMNS if h not in ("companyName", "salaryMin")]
    csv_str = ",".join(headers_missing_two) + "\nSome Data,some-slug\n"
    files = {"file": ("test_missing.csv", io.BytesIO(csv_str.encode("utf-8")), "text/csv")}
    res = client.post(
        "/api/v1/admin/imports/preview",
        files=files,
        headers={"X-CSRF-Token": auth_admin},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_records"] == 1
    assert data["accepted_count"] == 0
    assert data["rejected_count"] == 1
    issue = data["items"][0]["issues"][0]
    assert "Missing expected CSV header(s)" in issue
    assert "companyName" in issue
    assert "salaryMin" in issue


def test_unified_csv_razorpay_actual_file_preview(auth_admin):
    """Verify the actual user-uploaded Razorpay CSV file previews cleanly without errors."""
    from pathlib import Path
    razorpay_path = Path(r"c:\Users\Lenovo\Downloads\bengaluru_companies_offices_jobs_import_razorpay.csv")
    assert razorpay_path.exists(), f"File {razorpay_path} must exist"

    raw_bytes = razorpay_path.read_bytes()
    # Confirm byte-level UTF-8 BOM
    assert raw_bytes.startswith(b"\xef\xbb\xbf")

    # Record initial database counts to ensure preview is read-only
    db = SessionLocal()
    initial_comp_count = db.query(Company).count()
    initial_office_count = db.query(Office).count()
    initial_job_count = db.query(Job).count()
    db.close()

    files = {"file": ("bengaluru_companies_offices_jobs_import_razorpay.csv", io.BytesIO(raw_bytes), "text/csv")}
    res = client.post(
        "/api/v1/admin/imports/preview",
        files=files,
        headers={"X-CSRF-Token": auth_admin},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["total_records"] == 2
    assert data["accepted_count"] == 2
    assert data["rejected_count"] == 0
    assert len(data["items"]) == 2
    assert data["items"][0]["valid"] is True
    assert data["items"][0]["company_name"] == "Razorpay"
    assert data["items"][0]["job_title"] == "Lead Security Engineer"
    assert data["items"][1]["valid"] is True
    assert data["items"][1]["company_name"] == "Razorpay"
    assert data["items"][1]["job_title"] == "Lead Database Administrator"

    # Verify database was NOT modified during preview (preview is strictly read-only)
    db = SessionLocal()
    try:
        assert db.query(Company).count() == initial_comp_count
        assert db.query(Office).count() == initial_office_count
        assert db.query(Job).count() == initial_job_count
    finally:
        db.close()
