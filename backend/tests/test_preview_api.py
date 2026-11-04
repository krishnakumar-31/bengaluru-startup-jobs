import tempfile
from pathlib import Path
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.db.session import SessionLocal
from app.models import Company, Office, Job

client = TestClient(app)


def test_preview_mca_companies_endpoint():
    """
    Test GET /api/v1/preview/mca-companies returns 20 valid MCA startup records
    without touching PostgreSQL.
    """
    db = SessionLocal()
    initial_company_count = db.query(Company).count()
    initial_office_count = db.query(Office).count()
    initial_job_count = db.query(Job).count()
    db.close()

    response = client.get("/api/v1/preview/mca-companies")
    assert response.status_code == 200

    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 20

    # Verify response headers
    assert response.headers.get("X-Total-Records") == "20"
    assert response.headers.get("X-Valid-Coordinates") == "20"
    assert response.headers.get("X-Skipped-Records") == "0"
    assert response.headers.get("X-Address-Level-Count") == "19"
    assert response.headers.get("X-Locality-Centroid-Count") == "1"

    # Verify first company structure and values
    first = data[0]
    required_keys = [
        "cin", "name", "legal_name", "industry", "locality",
        "address", "latitude", "longitude", "geocoding_source", "confidence"
    ]
    for key in required_keys:
        assert key in first, f"Missing key '{key}' in preview item"

    assert first["cin"] == "U29100KA2022PTC165681"
    assert first["name"] == "Sparkle Hydrosystems"
    assert first["locality"] == "Peenya"
    assert first["geocoding_source"] == "nominatim_osm"
    assert first["confidence"] == "high"

    # Verify all coordinates are within Greater Bengaluru boundary
    for item in data:
        lat = item["latitude"]
        lng = item["longitude"]
        assert 12.70 <= lat <= 13.25, f"Latitude {lat} out of bounds"
        assert 77.35 <= lng <= 77.85, f"Longitude {lng} out of bounds"
        assert item["geocoding_source"] in ["nominatim_osm", "locality_centroid", "pincode_centroid"]

    # Verify database was NOT modified
    db = SessionLocal()
    assert db.query(Company).count() == initial_company_count
    assert db.query(Office).count() == initial_office_count
    assert db.query(Job).count() == initial_job_count
    db.close()


def test_preview_mca_companies_filtering():
    """
    Test filtering by locality and geocoding source.
    """
    # Filter by locality: Peenya
    res_peenya = client.get("/api/v1/preview/mca-companies?locality=Peenya")
    assert res_peenya.status_code == 200
    peenya_items = res_peenya.json()
    assert len(peenya_items) >= 1
    assert any("Peenya" in item["locality"] for item in peenya_items)

    # Filter by geocoding source: locality_centroid
    res_centroid = client.get("/api/v1/preview/mca-companies?geocoding_source=locality_centroid")
    assert res_centroid.status_code == 200
    centroid_items = res_centroid.json()
    assert len(centroid_items) == 1
    assert centroid_items[0]["name"] == "Ikebana Data Science And Research"
    assert centroid_items[0]["geocoding_source"] == "locality_centroid"

    # Filter by industry: FinTech
    res_fintech = client.get("/api/v1/preview/mca-companies?industry=FinTech")
    assert res_fintech.status_code == 200
    fintech_items = res_fintech.json()
    assert len(fintech_items) == 1
    assert fintech_items[0]["name"] == "Happi-cred Solutions"


def test_preview_mca_summary_endpoint():
    """
    Test GET /api/v1/preview/mca-companies/summary returns full summary metadata.
    """
    response = client.get("/api/v1/preview/mca-companies/summary")
    assert response.status_code == 200
    data = response.json()

    assert data["file_name"] == "mca_bengaluru_20_records.csv"
    assert data["total_records"] == 20
    assert data["valid_coordinates_count"] == 20
    assert data["skipped_records_count"] == 0
    assert data["address_level_count"] == 19
    assert data["locality_centroid_count"] == 1
    assert len(data["items"]) == 20


def test_preview_security_and_error_handling():
    """
    Test that directory traversal attempts are blocked with 400 and non-existent files return 404.
    """
    # Traversal attempt
    res_traversal = client.get("/api/v1/preview/mca-companies?file_path=../../../../etc/passwd")
    assert res_traversal.status_code == 400

    # Non-existent file within data
    res_not_found = client.get("/api/v1/preview/mca-companies?file_path=data/non_existent.csv")
    assert res_not_found.status_code == 404


def test_preview_handles_invalid_coordinates_safely():
    """
    Test that invalid coordinates in a CSV are safely skipped without failing.
    """
    from app.services.preview_service import load_mca_preview_records, PROJECT_ROOT

    # Create a small temp CSV in data/output/
    temp_csv = PROJECT_ROOT / "data" / "output" / "_test_temp_invalid.csv"
    try:
        temp_csv.write_text(
            "CIN,Display Name,Legal Name,Address,Latitude,Longitude,Geocoding Source,Confidence\n"
            "U11111KA2022PTC111111,Valid Co,Valid Co Ltd,Bengaluru,12.9716,77.5946,nominatim_osm,high\n"
            "U22222KA2022PTC222222,Bad Lat,Bad Lat Ltd,Bengaluru,NaN,77.5946,nominatim_osm,high\n"
            "U33333KA2022PTC333333,Out of Bounds,Out Bounds Ltd,Delhi,28.6139,77.2090,nominatim_osm,high\n"
            "U44444KA2022PTC444444,Missing Coords,Missing Coords Ltd,Bengaluru,,,nominatim_osm,high\n",
            encoding="utf-8"
        )

        items, total, skipped = load_mca_preview_records(file_path="data/output/_test_temp_invalid.csv")
        assert total == 4
        assert len(items) == 1
        assert skipped == 3
        assert items[0].name == "Valid Co"
    finally:
        if temp_csv.exists():
            temp_csv.unlink()


def test_preview_mca_batch_100_selection():
    """
    Test selecting the 100-record batch via ?batch=100 or ?file_path.
    Verifies that candidate records are unverified and summary contains batch statistics.
    """
    db = SessionLocal()
    initial_company_count = db.query(Company).count()
    db.close()

    # Query with batch=100
    res = client.get("/api/v1/preview/mca-companies?batch=100")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, list)
    assert len(data) == 77

    # Headers verification
    assert res.headers.get("X-Valid-Coordinates") == "77"
    assert res.headers.get("X-Manual-Verification-Count") == "77"

    # Verify all records are candidates requiring manual verification
    for item in data:
        assert item["is_verified"] is False
        assert item["verification_status"] == "unverified_candidate"
        assert item["candidate_status"] == "needs_manual_verification"
        assert 12.70 <= item["latitude"] <= 13.25
        assert 77.35 <= item["longitude"] <= 77.85

    # Query summary with batch=100
    res_summary = client.get("/api/v1/preview/mca-companies/summary?batch=100")
    assert res_summary.status_code == 200
    summary = res_summary.json()
    assert summary["file_name"] == "mca_bengaluru_100_records.csv"
    assert summary["total_processed"] == 100
    assert summary["valid_records_count"] == 77
    assert summary["duplicate_records_count"] == 20
    assert summary["failed_records_count"] == 3
    assert summary["manual_verification_count"] == 77
    assert summary["database_modified"] is False

    # Safe file_path selection
    res_fp = client.get("/api/v1/preview/mca-companies?file_path=mca_bengaluru_100_records.csv")
    assert res_fp.status_code == 200
    assert len(res_fp.json()) == 77

    # Ensure database is still completely untouched
    db = SessionLocal()
    assert db.query(Company).count() == initial_company_count
    db.close()

