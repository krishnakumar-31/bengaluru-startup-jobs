import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import engine, SessionLocal, get_db
from app.models.company import Company
from app.models.office import Office
from app.models.job import Job
from app.models.job_source import JobSource
from app.pipeline.importer.importer import DatabaseImporter
from app.pipeline.models import (
    ValidatedCompany,
    ValidatedJob,
    ValidatedOffice,
    ValidatedStartupRecord,
)


@pytest.fixture
def transactional_session():
    """Provides an isolated database session running within a transaction that rolls back

    after the test completes.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = SessionLocal(bind=connection)

    yield session

    session.close()
    if transaction.is_active:
        transaction.rollback()
    connection.close()


def test_database_importer_inserts_company_office_job_source(transactional_session):
    importer = DatabaseImporter(transactional_session)

    record = ValidatedStartupRecord(
        company=ValidatedCompany(
            name="Zerodha Clone",
            slug="zerodha-clone",
            website="https://zerodhaclone.in",
            description="Trading platform.",
            industry="FinTech",
            company_size="1001-5000",
            founded_year=2010,
            is_verified=True,
        ),
        offices=[
            ValidatedOffice(
                address="153/154 4th Cross, JP Nagar",
                locality="JP Nagar",
                city="Bengaluru",
                state="Karnataka",
                postal_code="560078",
                latitude=12.9081,
                longitude=77.5959,
            )
        ],
        jobs=[
            ValidatedJob(
                title="Python Core Engineer",
                slug="zerodha-clone-python-core",
                description="Build OMS and trading engines.",
                employment_type="full-time",
                experience_level="mid",
                salary_min=1800000,
                salary_max=2800000,
                currency="INR",
                skills=["Python", "PostgreSQL", "Kafka"],
                application_url="https://zerodhaclone.in/jobs/python-core",
                status="active",
                source_name="company_careers",
                source_url="https://zerodhaclone.in/careers",
            )
        ],
    )

    report = importer.import_batch([record], dry_run=False)

    assert report.companies_created == 1
    assert report.companies_updated == 0
    assert report.offices_created == 1
    assert report.jobs_created == 1
    assert report.sources_created == 1
    assert not report.has_errors

    # Verify directly in database session
    company = transactional_session.query(Company).filter(Company.slug == "zerodha-clone").first()
    assert company is not None
    assert company.name == "Zerodha Clone"
    assert len(company.offices) == 1
    assert company.offices[0].locality == "JP Nagar"
    assert len(company.jobs) == 1
    assert company.jobs[0].title == "Python Core Engineer"
    assert len(company.jobs[0].sources) == 1
    assert company.jobs[0].sources[0].source_name == "company_careers"


def test_database_importer_idempotency(transactional_session):
    importer = DatabaseImporter(transactional_session)

    record = ValidatedStartupRecord(
        company=ValidatedCompany(
            name="Hasura Clone",
            slug="hasura-clone",
            website="https://hasuraclone.io",
            description="GraphQL engine.",
            industry="DevTools",
        ),
        offices=[
            ValidatedOffice(
                address="80ft Road Koramangala",
                locality="Koramangala",
                city="Bengaluru",
                state="Karnataka",
                postal_code="560034",
                latitude=12.9345,
                longitude=77.6258,
            )
        ],
        jobs=[
            ValidatedJob(
                title="Platform Architect",
                slug="hasura-clone-platform-architect",
                description="Architecture role.",
                employment_type="full-time",
                experience_level="senior",
                application_url="https://hasuraclone.io/jobs/arch",
                status="active",
                source_name="company_careers",
                source_url="https://hasuraclone.io/careers",
            )
        ],
    )

    # 1. Initial Import
    report1 = importer.import_batch([record], dry_run=False)
    assert report1.companies_created == 1
    assert report1.jobs_created == 1

    # 2. Re-importing same record with updated description
    record.company.description = "Updated description for instant GraphQL."
    record.jobs[0].description = "Updated job description."

    report2 = importer.import_batch([record], dry_run=False)
    assert report2.companies_created == 0
    assert report2.companies_updated == 1
    assert report2.offices_created == 0
    assert report2.offices_updated == 1
    assert report2.jobs_created == 0
    assert report2.jobs_updated == 1
    assert report2.sources_updated == 1


def test_imported_records_accessible_via_rest_apis(transactional_session):
    """Verify that records ingested through the pipeline are instantly queryable

    through the existing FastAPI REST APIs (GET /jobs, /jobs/map, /companies).
    """
    importer = DatabaseImporter(transactional_session)

    record = ValidatedStartupRecord(
        company=ValidatedCompany(
            name="Postman Clone",
            slug="postman-clone",
            website="https://postmanclone.com",
            description="API workspace.",
            industry="Developer Tools",
        ),
        offices=[
            ValidatedOffice(
                address="Prestige Tech Park",
                locality="Bellandur",
                city="Bengaluru",
                state="Karnataka",
                postal_code="560103",
                latitude=12.9372,
                longitude=77.6918,
            )
        ],
        jobs=[
            ValidatedJob(
                title="Senior API Infrastructure Specialist",
                slug="postman-clone-api-infra",
                description="Scale distributed API collaboration runtime.",
                skills=["TypeScript", "Node.js", "PostgreSQL"],
                application_url="https://postmanclone.com/jobs/api-infra",
                status="active",
                source_name="careers",
                source_url="https://postmanclone.com/careers",
            )
        ],
    )
    importer.import_batch([record], dry_run=False)

    # Override FastAPI get_db dependency to use the active transactional session
    def override_get_db():
        yield transactional_session

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    try:
        # 1. Test GET /api/v1/companies
        res_comp = client.get("/api/v1/companies?search=postman")
        assert res_comp.status_code == 200
        comp_data = res_comp.json()
        assert comp_data["total"] >= 1
        comp_slugs = [c["slug"] for c in comp_data["items"]]
        assert "postman-clone" in comp_slugs

        # 2. Test GET /api/v1/jobs
        res_jobs = client.get("/api/v1/jobs?skills=typescript")
        assert res_jobs.status_code == 200
        jobs_data = res_jobs.json()
        assert len(jobs_data["items"]) >= 1
        assert any(j["slug"] == "postman-clone-api-infra" for j in jobs_data["items"])

        # 3. Test GET /api/v1/jobs/map
        res_map = client.get("/api/v1/jobs/map?locality=bellandur")
        assert res_map.status_code == 200
        map_items = res_map.json()
        assert len(map_items) >= 1
        target_pin = next(item for item in map_items if item["slug"] == "postman-clone-api-infra")
        assert target_pin["latitude"] == 12.9372
        assert target_pin["longitude"] == 77.6918
        assert target_pin["company_name"] == "Postman Clone"

    finally:
        app.dependency_overrides.clear()
