import pytest
from app.pipeline.models import (
    RawCompanyData,
    RawJobData,
    RawOfficeData,
    RawStartupRecord,
)
from app.pipeline.validation.geo import (
    validate_bengaluru_city_and_state,
    validate_bengaluru_coordinates,
    validate_bengaluru_locality,
    validate_bengaluru_postal_code,
)
from app.pipeline.validation.url import validate_web_url
from app.pipeline.validation.validator import PipelineValidator, slugify


def test_slugify_helper():
    assert slugify("Zerodha Broking Limited") == "zerodha-broking-limited"
    assert slugify("Hasura GraphQL Engine!") == "hasura-graphql-engine"
    assert slugify("Senior Backend Engineer (Python / Go)") == "senior-backend-engineer-python-go"


def test_bengaluru_coordinates_validation():
    # Valid Bengaluru coordinates (Koramangala, Indiranagar, Whitefield)
    valid, issues = validate_bengaluru_coordinates(12.9352, 77.6245)
    assert valid is True
    assert len(issues) == 0

    # Outside Bengaluru: Mumbai coordinates
    valid_mumbai, issues_mumbai = validate_bengaluru_coordinates(19.0760, 72.8777)
    assert valid_mumbai is False
    assert any("boundary" in i.message for i in issues_mumbai)

    # Outside Bengaluru: Delhi coordinates
    valid_delhi, issues_delhi = validate_bengaluru_coordinates(28.6139, 77.2090)
    assert valid_delhi is False

    # Out of global latitude range
    valid_invalid, issues_invalid = validate_bengaluru_coordinates(95.0, 77.0)
    assert valid_invalid is False
    assert any("range" in i.message for i in issues_invalid)

    # Missing coordinates
    valid_none, issues_none = validate_bengaluru_coordinates(None, None)
    assert valid_none is False


def test_bengaluru_postal_code_validation():
    # Valid Bengaluru PIN codes
    assert validate_bengaluru_postal_code("560034")[0] is True
    assert validate_bengaluru_postal_code("560103")[0] is True
    assert validate_bengaluru_postal_code("560001")[0] is True

    # Non-Bengaluru PIN codes
    assert validate_bengaluru_postal_code("110001")[0] is False  # Delhi
    assert validate_bengaluru_postal_code("400001")[0] is False  # Mumbai
    assert validate_bengaluru_postal_code("570001")[0] is False  # Mysuru
    assert validate_bengaluru_postal_code("invalid")[0] is False
    assert validate_bengaluru_postal_code(None)[0] is False


def test_bengaluru_locality_validation():
    # Known startup hubs
    assert validate_bengaluru_locality("Koramangala")[0] is True
    assert validate_bengaluru_locality("HSR Layout")[0] is True
    assert validate_bengaluru_locality("Bellandur")[0] is True
    assert validate_bengaluru_locality("Outer Ring Road")[0] is True

    # Empty locality
    valid_empty, issues_empty, _ = validate_bengaluru_locality("")
    assert valid_empty is False


def test_bengaluru_city_state_validation():
    valid, _, city, state = validate_bengaluru_city_and_state("Bangalore", "KA")
    assert valid is True
    assert city == "Bengaluru"
    assert state == "Karnataka"

    # Non-Bengaluru city
    valid_non_blr, issues, _, _ = validate_bengaluru_city_and_state("Hyderabad", "Telangana")
    assert valid_non_blr is False
    assert len(issues) == 2


def test_web_url_validation():
    # Valid URLs
    assert validate_web_url("https://hasura.io", "website")[0] is True
    assert validate_web_url("http://zerodha.com/careers", "careers_url")[0] is True

    # Missing required URL
    assert validate_web_url("", "website", required=True)[0] is False

    # Invalid scheme
    assert validate_web_url("ftp://example.com", "website")[0] is False
    assert validate_web_url("javascript:alert(1)", "website")[0] is False

    # Missing domain
    assert validate_web_url("https://", "website")[0] is False

    # Localhost in production
    assert validate_web_url("http://localhost:8000", "website", allow_localhost=False)[0] is False


def test_pipeline_validator_accepts_valid_record():
    validator = PipelineValidator()
    raw = RawStartupRecord(
        company=RawCompanyData(
            name="Test FinTech",
            slug="test-fintech",
            website="https://testfintech.in",
            description="Innovative payment infrastructure.",
            industry="FinTech",
        ),
        offices=[
            RawOfficeData(
                address="100 Feet Road, Koramangala",
                locality="Koramangala",
                city="Bengaluru",
                state="Karnataka",
                postal_code="560034",
                latitude=12.9345,
                longitude=77.6258,
            )
        ],
        jobs=[
            RawJobData(
                title="Python Backend Engineer",
                description="Build high-throughput payment ledgers.",
                employment_type="full-time",
                experience_level="mid",
                salary_min=1800000,
                salary_max=2800000,
                skills=["Python", "FastAPI", "PostgreSQL"],
                application_url="https://testfintech.in/jobs/backend",
                source_name="company_careers",
                source_url="https://testfintech.in/careers",
            )
        ],
    )

    batch = validator.validate_batch([raw])
    assert len(batch.accepted) == 1
    assert len(batch.rejected) == 0
    assert batch.is_valid is True

    val_rec = batch.accepted[0]
    assert val_rec.company.name == "Test FinTech"
    assert val_rec.offices[0].postal_code == "560034"
    assert val_rec.jobs[0].title == "Python Backend Engineer"


def test_pipeline_validator_rejects_non_bengaluru_record():
    validator = PipelineValidator()
    raw = RawStartupRecord(
        company=RawCompanyData(
            name="Delhi Startup",
            slug="delhi-startup",
            website="https://delhistartup.in",
            description="Startup in NCR.",
            industry="EdTech",
        ),
        offices=[
            RawOfficeData(
                address="Connaught Place",
                locality="CP",
                city="New Delhi",
                state="Delhi",
                postal_code="110001",
                latitude=28.6315,
                longitude=77.2167,
            )
        ],
        jobs=[],
    )

    batch = validator.validate_batch([raw])
    assert len(batch.accepted) == 0
    assert len(batch.rejected) == 1
    assert batch.is_valid is False

    rejected = batch.rejected[0]
    assert rejected.company_name == "Delhi Startup"
    issue_fields = [i.field for i in rejected.issues]
    assert any("postal_code" in f for f in issue_fields)
    assert any("coordinates" in f or "latitude" in f for f in issue_fields)


def test_pipeline_validator_salary_range_and_inbatch_duplicate_check():
    validator = PipelineValidator()
    raw1 = RawStartupRecord(
        company=RawCompanyData(
            name="Duplicate Co",
            slug="duplicate-co",
            website="https://duplicate.co",
            description="Company one.",
            industry="SaaS",
        ),
        offices=[
            RawOfficeData(
                address="Indiranagar 100ft",
                locality="Indiranagar",
                city="Bengaluru",
                state="Karnataka",
                postal_code="560038",
                latitude=12.9719,
                longitude=77.6412,
            )
        ],
        jobs=[
            RawJobData(
                title="Lead Architect",
                description="Desc",
                salary_min=5000000,
                salary_max=3000000,  # Invalid: min > max
                application_url="https://duplicate.co/jobs/arch",
                source_name="careers",
                source_url="https://duplicate.co/careers",
            )
        ],
    )
    raw2 = RawStartupRecord(
        company=RawCompanyData(
            name="Duplicate Co",
            slug="duplicate-co",  # In-batch duplicate company slug
            website="https://duplicate.co",
            description="Company two.",
            industry="SaaS",
        ),
        offices=[],
        jobs=[],
    )

    batch = validator.validate_batch([raw1, raw2])
    # raw1 rejected due to salary_min > salary_max
    # raw2 rejected due to in-batch duplicate slug and missing offices
    assert len(batch.accepted) == 0
    assert len(batch.rejected) == 2
