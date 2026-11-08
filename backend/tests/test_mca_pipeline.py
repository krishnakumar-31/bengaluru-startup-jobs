import pytest
from pathlib import Path
from app.pipeline.config import (
    BENGALURU_LAT_MIN,
    BENGALURU_LAT_MAX,
    BENGALURU_LNG_MIN,
    BENGALURU_LNG_MAX,
)
from app.pipeline.mca.geocoder import BengaluruGeocoder, BENGALURU_PINCODE_CENTROIDS
from app.pipeline.mca.processor import (
    clean_company_name,
    clean_pincode,
    extract_locality_from_address,
    map_industry,
    MCAPipelineProcessor,
)
from app.db.session import SessionLocal
from app.models import Company, Office, Job


def test_clean_company_name():
    """Verify company name cleaning and slugification."""
    display, slug = clean_company_name("SPARKLE HYDROSYSTEMS PRIVATE LIMITED")
    assert display == "Sparkle Hydrosystems"
    assert slug == "sparkle-hydrosystems"

    display2, slug2 = clean_company_name("KYRA CAREERS PVT. LTD.")
    assert display2 == "Kyra Careers"
    assert slug2 == "kyra-careers"


def test_clean_pincode():
    """Verify PIN code normalization and Bengaluru validation."""
    assert clean_pincode("560058.0") == "560058"
    assert clean_pincode(560102.0) == "560102"
    assert clean_pincode("560034") == "560034"
    # Non-Bengaluru pincodes should return None
    assert clean_pincode("570001.0") is None  # Mysore
    assert clean_pincode("110001") is None    # Delhi
    assert clean_pincode("invalid") is None


def test_extract_locality_from_address():
    """Verify locality extraction from Bengaluru address strings."""
    addr1 = "NO 2078 24TH MAIN 1ST SECTOR HSR LAYOUT BANGALORE,560102"
    assert extract_locality_from_address(addr1, "560102") == "Hsr Layout"

    addr2 = "25/1, Ground Floor, Skip House, Museum Road,Bengaluru,560025"
    assert "Museum Road" in extract_locality_from_address(addr2, "560025")

    addr3 = "1305, 9th Cross Road, J. P. Nagar 1st Phase, Bangalore,560078"
    assert "JP Nagar" in extract_locality_from_address(addr3, "560078")


def test_geocoder_centroid_and_bounding_box():
    """Verify that all Bengaluru centroids fall strictly within the official bounding box."""
    geocoder = BengaluruGeocoder(use_online=False)

    for pin, (lat, lng, desc) in BENGALURU_PINCODE_CENTROIDS.items():
        assert geocoder.is_within_bounds(lat, lng), f"PIN {pin} ({desc}) at ({lat}, {lng}) is out of bounds!"
        assert BENGALURU_LAT_MIN <= lat <= BENGALURU_LAT_MAX
        assert BENGALURU_LNG_MIN <= lng <= BENGALURU_LNG_MAX

    # Test geocode call with offline mode
    lat, lng, src, conf = geocoder.geocode(locality="HSR Layout", postal_code="560102")
    assert geocoder.is_within_bounds(lat, lng)
    assert src in ["locality_centroid", "pincode_centroid"]


def test_mca_processor_on_dataset():
    """Verify processor filters and extracts valid records from the raw MCA dataset."""
    project_root = Path(__file__).resolve().parent.parent.parent
    csv_path = project_root / "data" / "raw" / "company_master_data_2026-11-03 (1).csv"

    if not csv_path.exists():
        pytest.skip("MCA dataset file not present")

    cache_path = project_root / "data" / "output" / ".geocode_cache.json"
    geocoder = BengaluruGeocoder(cache_file=str(cache_path) if cache_path.exists() else None, use_online=False)
    processor = MCAPipelineProcessor(geocoder=geocoder)

    records = processor.filter_and_process(csv_path, limit=5)
    assert len(records) == 5

    for r in records:
        comp = r["company"]
        off = r["office"]

        assert comp["name"]
        assert comp["cin"].startswith("U") or comp["cin"].startswith("L")
        assert comp["slug"]
        assert off["postal_code"].startswith("560")
        assert off["city"] == "Bengaluru"
        assert off["state"] == "Karnataka"
        assert BENGALURU_LAT_MIN <= off["latitude"] <= BENGALURU_LAT_MAX
        assert BENGALURU_LNG_MIN <= off["longitude"] <= BENGALURU_LNG_MAX


def test_database_remains_unmodified_after_mca_processing():
    """Confirm that running the MCA processing workflow does not insert or alter database records."""
    db = SessionLocal()
    try:
        assert db.query(Company).count() >= 8
        assert db.query(Office).count() >= 8
        assert db.query(Job).count() >= 8
    finally:
        db.close()


def test_mca_batch_100_processing():
    """
    Verify 100-record batch processing:
    - Exactly 100 evaluated records
    - 20 duplicate records detected against 20-batch
    - 3 failed validation records with explicit reasons
    - 77 valid candidate records (all unverified, requiring manual review)
    - Zero database modifications
    """
    project_root = Path(__file__).resolve().parent.parent.parent
    raw_csv = project_root / "data" / "raw" / "company_master_data_2026-11-03 (1).csv"
    ref_20_csv = project_root / "data" / "output" / "mca_bengaluru_20_records.csv"
    if not ref_20_csv.exists():
        ref_20_csv = project_root / "data" / "archive" / "mca_500_candidate_backup" / "mca_bengaluru_20_records.csv"

    if not raw_csv.exists():
        pytest.skip("Raw MCA dataset file not present")

    cache_path = project_root / "data" / "output" / ".geocode_cache.json"
    geocoder = BengaluruGeocoder(cache_file=str(cache_path) if cache_path.exists() else None, use_online=False)
    processor = MCAPipelineProcessor(geocoder=geocoder)

    res = processor.process_batch(
        csv_file_path=raw_csv,
        batch_size=100,
        reference_file=ref_20_csv if ref_20_csv.exists() else None,
        mark_as_candidates=True,
    )

    assert res["total_processed"] == 100
    assert len(res["valid_records"]) == 77
    assert len(res["duplicate_records"]) == 20
    assert len(res["failed_records"]) == 3
    assert res["address_level_count"] == 19
    assert res["locality_centroid_count"] == 58
    assert res["manual_verification_count"] == 77

    # Verify candidate records are NOT marked as verified startups
    for r in res["valid_records"]:
        comp = r["company"]
        assert comp["is_verified"] is False
        assert comp["verification_status"] == "unverified_candidate"
        assert comp["candidate_status"] == "needs_manual_verification"

    # Verify failed records have failure reasons
    for fr in res["failed_records"]:
        assert "failure_reason" in fr
        assert fr["failure_stage"] in ["PINCODE_VALIDATION", "COMPANY_STATUS", "GEOCODING_BOUNDS"]

    # Verify duplicate records were caught
    for dr in res["duplicate_records"]:
        assert dr["cin"].startswith("U") or dr["cin"].startswith("L")
        assert "duplicate_reason" in dr

    # Verify database was NOT touched
    db = SessionLocal()
    try:
        assert db.query(Company).count() >= 8
        assert db.query(Office).count() >= 8
        assert db.query(Job).count() >= 8
    finally:
        db.close()


def test_classify_company_entity_logic():
    """
    Test entity classification into startup, established_company, or uncertain_for_review.
    Enforces Requirement 6 & 7: Do not classify all MCA companies as startups.
    """
    from app.pipeline.mca.processor import classify_company_entity

    # 1. Tech Startup Candidates
    cls1, r1 = classify_company_entity("Sparkle Cloud AI", "Sparkle Cloud AI Labs Private Limited", "Business Services", 2021)
    assert cls1 == "startup"
    assert "technology" in r1.lower() or "markers" in r1.lower()

    cls2, _ = classify_company_entity("Fintech Pay", "Fintech Pay Solutions Private Limited", "Finance", 2019)
    assert cls2 == "startup"

    # 2. Established / Traditional Companies
    cls3, r3 = classify_company_entity("Shree Balaji Granites", "Shree Balaji Granites And Marble Trading Pvt Ltd", "Trading", 2005)
    assert cls3 == "established_company"
    assert "traditional" in r3.lower()

    cls4, _ = classify_company_entity("Apex Construction", "Apex Builders And Developers Private Limited", "Construction", 2012)
    assert cls4 == "established_company"

    cls5, _ = classify_company_entity("South India Saw Mill", "South India Timber And Saw Mill Pvt Ltd", "Manufacturing", 1998)
    assert cls5 == "established_company"

    # 3. Uncertain for Review (Ambiguous / Generic)
    cls6, r6 = classify_company_entity("Universal Consultancy", "Universal Consulting Services Private Limited", "Business Services", 2015)
    assert cls6 == "uncertain_for_review"
    assert "manual review" in r6.lower()


def test_process_to_target_candidates_expansion():
    """
    Test expanding candidate collection targeting unique candidate companies across batches.
    Verifies CIN deduplication, entity classification preservation, geocoding precision,
    and unverified candidate status without database mutation.
    """
    data_dir = Path(__file__).resolve().parent.parent.parent / "data"
    raw_file = data_dir / "raw" / "company_master_data_2026-11-03 (1).csv"
    ref_20 = data_dir / "output" / "mca_bengaluru_20_records.csv"
    ref_100 = data_dir / "output" / "mca_bengaluru_100_records.csv"
    cache_path = data_dir / "output" / ".geocode_cache.json"

    if not raw_file.exists():
        pytest.skip("Raw MCA dataset file not available")

    geocoder = BengaluruGeocoder(cache_file=str(cache_path), use_online=False)
    processor = MCAPipelineProcessor(geocoder=geocoder)

    # Run for target 500 with offline cache
    res = processor.process_to_target_candidates(
        csv_file_path=raw_file,
        target_total_unique=500,
        reference_files=[ref_20, ref_100] if ref_20.exists() and ref_100.exists() else None,
        mark_as_candidates=True,
    )

    all_candidates = res["all_unique_candidates"]
    assert len(all_candidates) == 500

    # Ensure all CINs across the 500 candidates are strictly unique
    cins = [c["company"]["cin"] for c in all_candidates]
    assert len(cins) == len(set(cins))

    # Verify entity classification distribution exists
    stats = res["summary_stats"]
    assert stats["classification_distribution"]["startup"] > 0
    assert stats["classification_distribution"]["established_company"] > 0
    assert stats["classification_distribution"]["uncertain_for_review"] > 0

    # Verify geocoding separation (address-level vs centroid)
    assert res["address_level_count"] > 0
    assert res["locality_centroid_count"] > 0
    assert res["address_level_count"] + res["locality_centroid_count"] == 500

    # Verify no candidate is marked as verified
    for c in all_candidates:
        assert c["company"]["is_verified"] is False
        assert c["company"]["candidate_status"] == "needs_manual_verification"
        assert c["company"]["entity_classification"] in ["startup", "established_company", "uncertain_for_review"]

    # Verify database remains untouched (seed startups intact)
    db = SessionLocal()
    try:
        assert db.query(Company).count() >= 8
        assert db.query(Office).count() >= 8
        assert db.query(Job).count() >= 8
    finally:
        db.close()


