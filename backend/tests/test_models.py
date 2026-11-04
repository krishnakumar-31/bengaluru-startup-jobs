import pytest
from datetime import datetime, timezone
from sqlalchemy import text, inspect
from sqlalchemy.exc import IntegrityError
from app.db.session import SessionLocal, engine
from app.models.company import Company
from app.models.office import Office
from app.models.job import Job
from app.models.job_source import JobSource
from app.repositories.company_repository import CompanyRepository
from app.repositories.job_repository import JobRepository


@pytest.fixture
def db_session():
    """Provides a transactional database session that rolls back after each test,

    ensuring no test data is persisted in the database.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = SessionLocal(bind=connection)

    yield session

    session.close()
    if transaction.is_active:
        transaction.rollback()
    connection.close()


def test_tables_exist_in_database():
    """Verify that all four required tables exist in the PostgreSQL database."""
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    required_tables = ["companies", "offices", "jobs", "job_sources"]
    for table_name in required_tables:
        assert table_name in existing_tables, f"Table {table_name} is missing from the database."


def test_table_columns():
    """Verify that all tables have the expected columns."""
    inspector = inspect(engine)

    company_cols = {c["name"] for c in inspector.get_columns("companies")}
    expected_company_cols = {
        "id", "name", "slug", "description", "website", "logo_url",
        "industry", "company_size", "founded_year", "is_verified",
        "created_at", "updated_at",
    }
    assert expected_company_cols.issubset(company_cols)

    office_cols = {c["name"] for c in inspector.get_columns("offices")}
    expected_office_cols = {
        "id", "company_id", "address", "locality", "city", "state",
        "postal_code", "latitude", "longitude", "created_at", "updated_at",
    }
    assert expected_office_cols.issubset(office_cols)

    job_cols = {c["name"] for c in inspector.get_columns("jobs")}
    expected_job_cols = {
        "id", "company_id", "office_id", "title", "slug", "description",
        "employment_type", "experience_level", "salary_min", "salary_max",
        "currency", "skills", "application_url", "status", "posted_at",
        "expires_at", "created_at", "updated_at",
    }
    assert expected_job_cols.issubset(job_cols)

    job_source_cols = {c["name"] for c in inspector.get_columns("job_sources")}
    expected_job_source_cols = {
        "id", "job_id", "source_name", "source_url", "last_verified_at", "created_at",
    }
    assert expected_job_source_cols.issubset(job_source_cols)


def test_company_and_multiple_offices_relationship(db_session):
    """Test creating a company with multiple offices and verifying relationships."""
    company = Company(
        name="Test Startup Tech",
        slug="test-startup-tech",
        description="A startup based in Bengaluru",
        website="https://teststartup.in",
        industry="SaaS",
        company_size="11-50",
        founded_year=2022,
        is_verified=True,
    )
    db_session.add(company)
    db_session.flush()

    office_koramangala = Office(
        company_id=company.id,
        address="100 Feet Rd, 4th Block",
        locality="Koramangala",
        city="Bengaluru",
        state="Karnataka",
        postal_code="560034",
        latitude=12.9352,
        longitude=77.6245,
    )
    office_hsr = Office(
        company_id=company.id,
        address="27th Main Rd, Sector 1",
        locality="HSR Layout",
        city="Bengaluru",
        state="Karnataka",
        postal_code="560102",
        latitude=12.9121,
        longitude=77.6446,
    )
    db_session.add_all([office_koramangala, office_hsr])
    db_session.flush()

    # Verify relationships
    assert len(company.offices) == 2
    assert office_koramangala.company.name == "Test Startup Tech"
    assert office_hsr.company.id == company.id


def test_job_and_job_sources_relationship(db_session):
    """Test creating a job with office association and job sources."""
    company = Company(
        name="Fintech Innovators",
        slug="fintech-innovators",
        description="Next-gen payments infrastructure",
    )
    db_session.add(company)
    db_session.flush()

    office = Office(
        company_id=company.id,
        address="12th Main, Indiranagar",
        locality="Indiranagar",
        city="Bengaluru",
        latitude=12.9719,
        longitude=77.6412,
    )
    db_session.add(office)
    db_session.flush()

    job = Job(
        company_id=company.id,
        office_id=office.id,
        title="Senior Backend Engineer",
        slug="fintech-senior-backend-engineer",
        description="Build scalable distributed services with Python and PostgreSQL.",
        employment_type="full-time",
        experience_level="senior",
        salary_min=2500000,
        salary_max=4000000,
        currency="INR",
        skills=["Python", "FastAPI", "PostgreSQL", "Kafka"],
        status="active",
    )
    db_session.add(job)
    db_session.flush()

    source = JobSource(
        job_id=job.id,
        source_name="company_careers",
        source_url="https://fintechinnovators.com/careers/senior-backend",
        last_verified_at=datetime.now(timezone.utc),
    )
    db_session.add(source)
    db_session.flush()

    # Verify bidirectional relationships
    assert job.company.slug == "fintech-innovators"
    assert job.office.locality == "Indiranagar"
    assert len(job.sources) == 1
    assert job.sources[0].source_name == "company_careers"
    assert source.job.title == "Senior Backend Engineer"
    assert job.is_active is True
    assert job.skills == ["Python", "FastAPI", "PostgreSQL", "Kafka"]


def test_latitude_longitude_validation():
    """Verify that latitude and longitude must be within valid geographic bounds."""
    # Valid coordinates
    office = Office(
        company_id=1,
        locality="Bellandur",
        latitude=12.9260,
        longitude=77.6762,
    )
    assert office.latitude == 12.9260
    assert office.longitude == 77.6762

    # Latitude out of bounds (> 90)
    with pytest.raises(ValueError, match="Latitude must be between -90.0 and 90.0"):
        Office(company_id=1, latitude=95.0, longitude=77.0)

    # Latitude out of bounds (< -90)
    with pytest.raises(ValueError, match="Latitude must be between -90.0 and 90.0"):
        Office(company_id=1, latitude=-95.0, longitude=77.0)

    # Longitude out of bounds (> 180)
    with pytest.raises(ValueError, match="Longitude must be between -180.0 and 180.0"):
        Office(company_id=1, latitude=12.0, longitude=185.0)

    # Longitude out of bounds (< -180)
    with pytest.raises(ValueError, match="Longitude must be between -180.0 and 180.0"):
        Office(company_id=1, latitude=12.0, longitude=-185.0)


def test_unique_company_slug_constraint(db_session):
    """Verify that duplicate company slugs are rejected by database unique constraints."""
    company1 = Company(name="Alpha Co", slug="duplicate-slug")
    db_session.add(company1)
    db_session.flush()

    company2 = Company(name="Beta Co", slug="duplicate-slug")
    db_session.add(company2)

    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_unique_job_slug_constraint(db_session):
    """Verify that duplicate job slugs are rejected."""
    company = Company(name="Gamma Labs", slug="gamma-labs")
    db_session.add(company)
    db_session.flush()

    job1 = Job(
        company_id=company.id,
        title="DevOps Engineer",
        slug="gamma-devops-engineer",
        description="Maintain CI/CD and cloud infra.",
    )
    db_session.add(job1)
    db_session.flush()

    job2 = Job(
        company_id=company.id,
        title="DevOps Engineer II",
        slug="gamma-devops-engineer",  # Duplicate slug
        description="Different description, same slug.",
    )
    db_session.add(job2)

    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_duplicate_job_at_same_office_constraint(db_session):
    """Verify that duplicate job titles for the same company at the same office are rejected."""
    company = Company(name="Duplicate Check Co", slug="duplicate-check-co")
    db_session.add(company)
    db_session.flush()

    office = Office(company_id=company.id, locality="Koramangala")
    db_session.add(office)
    db_session.flush()

    job1 = Job(
        company_id=company.id,
        office_id=office.id,
        title="Data Engineer",
        slug="dup-data-engineer-1",
        description="ETL and pipelines.",
    )
    db_session.add(job1)
    db_session.flush()

    job2 = Job(
        company_id=company.id,
        office_id=office.id,
        title="Data Engineer",
        slug="dup-data-engineer-2",
        description="Duplicate role title at same office.",
    )
    db_session.add(job2)

    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_duplicate_job_source_url_constraint(db_session):
    """Verify that duplicate source URLs for the same job are rejected."""
    company = Company(name="Source Check Co", slug="source-check-co")
    db_session.add(company)
    db_session.flush()

    job = Job(
        company_id=company.id,
        title="Product Manager",
        slug="pm-role",
        description="PM role.",
    )
    db_session.add(job)
    db_session.flush()

    s1 = JobSource(job_id=job.id, source_name="careers", source_url="https://sourcecheck.co/jobs/pm")
    db_session.add(s1)
    db_session.flush()

    s2 = JobSource(job_id=job.id, source_name="careers_alt", source_url="https://sourcecheck.co/jobs/pm")
    db_session.add(s2)

    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_salary_min_max_constraint(db_session):
    """Verify that salary_min > salary_max is rejected by database CheckConstraint."""
    company = Company(name="Salary Co", slug="salary-co")
    db_session.add(company)
    db_session.flush()

    invalid_salary_job = Job(
        company_id=company.id,
        title="Lead Architect",
        slug="lead-architect",
        description="Architecture role.",
        salary_min=5000000,
        salary_max=3000000,  # Invalid: min > max
    )
    db_session.add(invalid_salary_job)

    with pytest.raises(IntegrityError):
        db_session.flush()
    db_session.rollback()


def test_cascade_delete_company_removes_offices_and_jobs(db_session):
    """Verify that deleting a Company cascades to delete its Offices, Jobs, and JobSources."""
    company = Company(name="Cascade Target", slug="cascade-target")
    db_session.add(company)
    db_session.flush()

    office = Office(company_id=company.id, locality="Whitefield")
    db_session.add(office)
    db_session.flush()

    job = Job(
        company_id=company.id,
        office_id=office.id,
        title="Frontend Developer",
        slug="cascade-target-frontend",
        description="React and Next.js developer.",
    )
    db_session.add(job)
    db_session.flush()

    source = JobSource(
        job_id=job.id,
        source_name="linkedin",
        source_url="https://linkedin.com/jobs/123",
    )
    db_session.add(source)
    db_session.flush()

    office_id = office.id
    job_id = job.id
    source_id = source.id

    # Delete company
    db_session.delete(company)
    db_session.flush()
    db_session.expire_all()

    assert db_session.get(Office, office_id) is None
    assert db_session.get(Job, job_id) is None
    assert db_session.get(JobSource, source_id) is None


def test_delete_office_sets_job_office_id_null(db_session):
    """Verify that deleting an Office sets job.office_id to NULL without deleting the Job."""
    company = Company(name="Independent Jobs Co", slug="independent-jobs-co")
    db_session.add(company)
    db_session.flush()

    office = Office(company_id=company.id, locality="Electronic City")
    db_session.add(office)
    db_session.flush()

    job = Job(
        company_id=company.id,
        office_id=office.id,
        title="Fullstack Developer",
        slug="independent-fullstack",
        description="Fullstack role.",
    )
    db_session.add(job)
    db_session.flush()

    job_id = job.id
    office_id = office.id

    # Delete office
    db_session.delete(office)
    db_session.flush()

    # Office is gone, but Job remains with office_id=None
    assert db_session.get(Office, office_id) is None
    persisted_job = db_session.get(Job, job_id)
    assert persisted_job is not None
    assert persisted_job.office_id is None


def test_repositories_with_new_schema(db_session):
    """Verify CompanyRepository and JobRepository work properly with the new schema."""
    company_repo = CompanyRepository(db_session)
    job_repo = JobRepository(db_session)

    company = Company(name="Repo Tech", slug="repo-tech")
    db_session.add(company)
    db_session.flush()

    office = Office(company_id=company.id, locality="Koramangala")
    db_session.add(office)
    db_session.flush()

    job = Job(
        company_id=company.id,
        office_id=office.id,
        title="Site Reliability Engineer",
        slug="repo-sre",
        description="SRE role",
        status="active",
    )
    db_session.add(job)
    db_session.flush()

    # Test repository retrieval
    found_company = company_repo.get_by_slug("repo-tech")
    assert found_company is not None
    assert found_company.name == "Repo Tech"

    # Locality-based filter
    companies_in_kora = company_repo.list_all(locality="Koramangala")
    assert any(c.id == company.id for c in companies_in_kora)

    # Job repository active jobs list
    active_jobs = job_repo.list_active(locality="Koramangala")
    assert any(j.id == job.id for j in active_jobs)
