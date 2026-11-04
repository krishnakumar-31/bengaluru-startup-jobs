import pytest
from datetime import datetime, timezone, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import engine, SessionLocal, get_db
from app.models.company import Company
from app.models.office import Office
from app.models.job import Job
from app.models.job_source import JobSource


@pytest.fixture
def client_and_session():
    """Provides a TestClient backed by an isolated database transaction that rolls back

    cleanly after each test.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = SessionLocal(bind=connection)

    def override_get_db():
        yield session

    app.dependency_overrides[get_db] = override_get_db
    client = TestClient(app)

    yield client, session

    app.dependency_overrides.clear()
    session.close()
    if transaction.is_active:
        transaction.rollback()
    connection.close()


def test_list_jobs_empty(client_and_session):
    client, _ = client_and_session
    response = client.get("/api/v1/jobs?company=non-existent-company-slug-xyz")
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["total"] == 0
    assert data["page"] == 1
    assert data["total_pages"] == 0
    assert data["has_next"] is False
    assert data["has_prev"] is False


def test_list_jobs_pagination(client_and_session):
    client, session = client_and_session

    company = Company(name="ScaleUp Tech Unique", slug="scaleup-tech-unique")
    session.add(company)
    session.flush()

    # Create 5 jobs
    for i in range(1, 6):
        job = Job(
            company_id=company.id,
            title=f"Engineer {i}",
            slug=f"scaleup-unique-engineer-{i}",
            description=f"Description {i}",
            status="active",
        )
        session.add(job)
    session.flush()

    # Page 1 with limit 2 scoped to this company
    res = client.get(f"/api/v1/jobs?company={company.slug}&page=1&limit=2")
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) == 2
    assert data["total"] == 5
    assert data["page"] == 1
    assert data["limit"] == 2
    assert data["total_pages"] == 3
    assert data["has_next"] is True
    assert data["has_prev"] is False

    # Page 3 with limit 2 (last page)
    res_page3 = client.get(f"/api/v1/jobs?company={company.slug}&page=3&limit=2")
    assert res_page3.status_code == 200
    data3 = res_page3.json()
    assert len(data3["items"]) == 1
    assert data3["page"] == 3
    assert data3["has_next"] is False
    assert data3["has_prev"] is True

    # Test skip parameter alternative
    res_skip = client.get(f"/api/v1/jobs?company={company.slug}&skip=2&limit=2")
    assert res_skip.status_code == 200
    data_skip = res_skip.json()
    assert len(data_skip["items"]) == 2
    assert data_skip["page"] == 2


def test_list_jobs_search_title_and_description(client_and_session):
    client, session = client_and_session

    company = Company(name="Search Corp Unique", slug="search-corp-unique")
    session.add(company)
    session.flush()

    j1 = Job(
        company_id=company.id,
        title="Unique Distributed Systems Architect",
        slug="unique-dist-arch",
        description="Lead cloud infrastructure design",
        status="active",
    )
    j2 = Job(
        company_id=company.id,
        title="Mobile Developer",
        slug="unique-mobile-dev",
        description="Experience with Flutter and distributed databases",
        status="active",
    )
    j3 = Job(
        company_id=company.id,
        title="Growth Marketer",
        slug="unique-growth-marketer",
        description="D2C acquisition specialist",
        status="active",
    )
    session.add_all([j1, j2, j3])
    session.flush()

    # Search matches title in j1 and description in j2 scoped to this company
    res = client.get(f"/api/v1/jobs?company={company.slug}&search=distributed")
    assert res.status_code == 200
    data = res.json()
    titles = [item["title"] for item in data["items"]]
    assert len(titles) == 2
    assert "Unique Distributed Systems Architect" in titles
    assert "Mobile Developer" in titles
    assert "Growth Marketer" not in titles


def test_list_jobs_filter_by_skills(client_and_session):
    client, session = client_and_session

    company = Company(name="Skills Co Unique", slug="skills-co-unique")
    session.add(company)
    session.flush()

    j1 = Job(
        company_id=company.id,
        title="Python Backend Engineer",
        slug="py-back-unique",
        description="Desc",
        skills=["Python", "FastAPI", "PostgreSQL"],
        status="active",
    )
    j2 = Job(
        company_id=company.id,
        title="Frontend React Specialist",
        slug="react-spec-unique",
        description="Desc",
        skills=["TypeScript", "React", "Next.js"],
        status="active",
    )
    session.add_all([j1, j2])
    session.flush()

    # Filter for Python (case-insensitive) scoped to company
    res = client.get(f"/api/v1/jobs?company={company.slug}&skills=python")
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["slug"] == "py-back-unique"

    # Filter for React scoped to company
    res2 = client.get(f"/api/v1/jobs?company={company.slug}&skills=react")
    assert res2.status_code == 200
    assert len(res2.json()["items"]) == 1
    assert res2.json()["items"][0]["slug"] == "react-spec-unique"


def test_list_jobs_filter_by_locality(client_and_session):
    client, session = client_and_session

    company = Company(name="Geo Tech Unique", slug="geo-tech-unique")
    session.add(company)
    session.flush()

    office_kora = Office(company_id=company.id, locality="Koramangala", city="Bengaluru")
    office_hsr = Office(company_id=company.id, locality="HSR Layout", city="Bengaluru")
    session.add_all([office_kora, office_hsr])
    session.flush()

    j1 = Job(
        company_id=company.id,
        office_id=office_kora.id,
        title="Backend Dev Koramangala Unique",
        slug="backend-kora-unique",
        description="Desc",
        status="active",
    )
    j2 = Job(
        company_id=company.id,
        office_id=office_hsr.id,
        title="Backend Dev HSR Unique",
        slug="backend-hsr-unique",
        description="Desc",
        status="active",
    )
    session.add_all([j1, j2])
    session.flush()

    res = client.get(f"/api/v1/jobs?company={company.slug}&locality=koramangala")
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) == 1
    assert data["items"][0]["title"] == "Backend Dev Koramangala Unique"


def test_list_jobs_filter_by_employment_and_experience(client_and_session):
    client, session = client_and_session

    company = Company(name="Career Corp Unique", slug="career-corp-unique")
    session.add(company)
    session.flush()

    j1 = Job(
        company_id=company.id,
        title="Senior Full-Time",
        slug="sr-ft-unique",
        description="Desc",
        employment_type="full-time",
        experience_level="senior",
        status="active",
    )
    j2 = Job(
        company_id=company.id,
        title="Intern Part-Time",
        slug="intern-pt-unique",
        description="Desc",
        employment_type="internship",
        experience_level="entry",
        status="active",
    )
    session.add_all([j1, j2])
    session.flush()

    # Filter by employment_type
    res_ft = client.get(f"/api/v1/jobs?company={company.slug}&employment_type=full-time")
    assert res_ft.status_code == 200
    assert len(res_ft.json()["items"]) == 1
    assert res_ft.json()["items"][0]["slug"] == "sr-ft-unique"

    # Filter by experience_level
    res_entry = client.get(f"/api/v1/jobs?company={company.slug}&experience_level=entry")
    assert res_entry.status_code == 200
    assert len(res_entry.json()["items"]) == 1
    assert res_entry.json()["items"][0]["slug"] == "intern-pt-unique"


def test_list_jobs_filter_by_company(client_and_session):
    client, session = client_and_session

    c1 = Company(name="Razorpay Clone", slug="razorpay-clone")
    c2 = Company(name="Flipkart Clone", slug="flipkart-clone")
    session.add_all([c1, c2])
    session.flush()

    j1 = Job(company_id=c1.id, title="Fintech Eng", slug="fintech-eng", description="Desc", status="active")
    j2 = Job(company_id=c2.id, title="Ecommerce Eng", slug="ecom-eng", description="Desc", status="active")
    session.add_all([j1, j2])
    session.flush()

    # Filter by company slug
    res = client.get("/api/v1/jobs?company=razorpay-clone")
    assert res.status_code == 200
    assert len(res.json()["items"]) == 1
    assert res.json()["items"][0]["slug"] == "fintech-eng"

    # Filter by company_id
    res_id = client.get(f"/api/v1/jobs?company_id={c2.id}")
    assert res_id.status_code == 200
    assert len(res_id.json()["items"]) == 1
    assert res_id.json()["items"][0]["slug"] == "ecom-eng"


def test_list_jobs_filter_by_active_status_and_expired(client_and_session):
    client, session = client_and_session

    company = Company(name="Status Co", slug="status-co")
    session.add(company)
    session.flush()

    now = datetime.now(timezone.utc)
    future = now + timedelta(days=30)
    past = now - timedelta(days=5)

    j_active = Job(
        company_id=company.id,
        title="Active Current Job",
        slug="active-job",
        description="Active",
        status="active",
        expires_at=future,
    )
    j_closed = Job(
        company_id=company.id,
        title="Closed Job",
        slug="closed-job",
        description="Closed",
        status="closed",
    )
    j_expired = Job(
        company_id=company.id,
        title="Expired Job",
        slug="expired-job",
        description="Expired in past",
        status="active",
        expires_at=past,
    )
    session.add_all([j_active, j_closed, j_expired])
    session.flush()

    # Default listing: active and unexpired
    res_default = client.get("/api/v1/jobs")
    assert res_default.status_code == 200
    items = res_default.json()["items"]
    slugs = [item["slug"] for item in items]
    assert "active-job" in slugs
    assert "closed-job" not in slugs
    assert "expired-job" not in slugs  # Expired job is excluded!

    # Include expired
    res_inc_expired = client.get("/api/v1/jobs?include_expired=true")
    assert res_inc_expired.status_code == 200
    inc_slugs = [item["slug"] for item in res_inc_expired.json()["items"]]
    assert "expired-job" in inc_slugs

    # Filter status="closed"
    res_closed = client.get("/api/v1/jobs?status=closed")
    assert res_closed.status_code == 200
    assert len(res_closed.json()["items"]) == 1
    assert res_closed.json()["items"][0]["slug"] == "closed-job"


def test_get_job_detail_success_and_not_found(client_and_session):
    client, session = client_and_session

    company = Company(name="Detail Co", slug="detail-co", website="https://detail.co")
    session.add(company)
    session.flush()

    office = Office(company_id=company.id, locality="Indiranagar", city="Bengaluru")
    session.add(office)
    session.flush()

    job = Job(
        company_id=company.id,
        office_id=office.id,
        title="Lead Platform Engineer",
        slug="lead-platform-eng",
        description="Lead platform architecture.",
        skills=["Go", "Kubernetes", "AWS"],
        status="active",
    )
    session.add(job)
    session.flush()

    source = JobSource(
        job_id=job.id,
        source_name="careers_page",
        source_url="https://detail.co/careers/lead",
    )
    session.add(source)
    session.flush()

    # Fetch existing job
    res = client.get(f"/api/v1/jobs/{job.id}")
    assert res.status_code == 200
    data = res.json()
    assert data["id"] == job.id
    assert data["title"] == "Lead Platform Engineer"
    assert data["company"]["name"] == "Detail Co"
    assert data["office"]["locality"] == "Indiranagar"
    assert len(data["sources"]) == 1
    assert data["sources"][0]["source_name"] == "careers_page"

    # Fetch non-existent job
    res_404 = client.get("/api/v1/jobs/999999")
    assert res_404.status_code == 404
    assert "not found" in res_404.json()["detail"].lower()


def test_jobs_map_endpoint_coordinates(client_and_session):
    client, session = client_and_session

    company = Company(name="Map Enterprise", slug="map-enterprise")
    session.add(company)
    session.flush()

    # Office with coordinates
    office_with_coords = Office(
        company_id=company.id,
        locality="Koramangala",
        city="Bengaluru",
        latitude=12.9352,
        longitude=77.6245,
    )
    # Office without coordinates
    office_without_coords = Office(
        company_id=company.id,
        locality="Whitefield",
        city="Bengaluru",
        latitude=None,
        longitude=None,
    )
    session.add_all([office_with_coords, office_without_coords])
    session.flush()

    # Job with verified coordinates
    j_mapped = Job(
        company_id=company.id,
        office_id=office_with_coords.id,
        title="Map Mapped Role",
        slug="map-mapped-role",
        description="Office has lat/lng",
        status="active",
    )
    # Job without coordinates
    j_unmapped = Job(
        company_id=company.id,
        office_id=office_without_coords.id,
        title="Unmapped Role",
        slug="unmapped-role",
        description="Office lacks coords",
        status="active",
    )
    session.add_all([j_mapped, j_unmapped])
    session.flush()

    res = client.get("/api/v1/jobs/map?search=Map Mapped Role")
    assert res.status_code == 200
    map_data = res.json()
    assert len(map_data) == 1
    item = map_data[0]
    assert item["title"] == "Map Mapped Role"
    assert item["company_name"] == "Map Enterprise"
    assert item["latitude"] == 12.9352
    assert item["longitude"] == 77.6245
    assert item["locality"] == "Koramangala"

    # Verify that unmapped job is not included in map results
    full_res = client.get("/api/v1/jobs/map")
    assert full_res.status_code == 200
    all_map_titles = [m["title"] for m in full_res.json()]
    assert "Map Mapped Role" in all_map_titles
    assert "Unmapped Role" not in all_map_titles


def test_company_listing_search_and_pagination(client_and_session):
    client, session = client_and_session

    c1 = Company(name="Test Fintech Company", slug="test-fintech-co", industry="TestFinTech", is_verified=True)
    c2 = Company(name="Test Delivery Company", slug="test-delivery-co", industry="TestConsumerTech", is_verified=True)
    c3 = Company(name="Test UniqueDevtools Company", slug="test-devtools-unique", industry="TestDevTools", is_verified=False)
    session.add_all([c1, c2, c3])
    session.flush()

    o1 = Office(company_id=c1.id, locality="TestJPNagar")
    o2 = Office(company_id=c2.id, locality="TestKoramangala")
    session.add_all([o1, o2])
    session.flush()

    # Pagination scoped to search
    res = client.get("/api/v1/companies?search=Test&page=1&limit=2")
    assert res.status_code == 200
    data = res.json()
    assert len(data["items"]) == 2
    assert data["total"] == 3
    assert data["page"] == 1
    assert data["total_pages"] == 2
    assert data["has_next"] is True

    # Search by name
    res_search = client.get("/api/v1/companies?search=UniqueDevtools")
    assert res_search.status_code == 200
    assert len(res_search.json()["items"]) == 1
    assert res_search.json()["items"][0]["slug"] == "test-devtools-unique"

    # Filter by industry
    res_ind = client.get("/api/v1/companies?industry=TestFinTech")
    assert res_ind.status_code == 200
    assert len(res_ind.json()["items"]) == 1
    assert res_ind.json()["items"][0]["slug"] == "test-fintech-co"

    # Filter by locality
    res_loc = client.get("/api/v1/companies?locality=testkoramangala")
    assert res_loc.status_code == 200
    assert len(res_loc.json()["items"]) == 1
    assert res_loc.json()["items"][0]["slug"] == "test-delivery-co"


def test_company_details_and_offices_endpoints(client_and_session):
    client, session = client_and_session

    company = Company(
        name="Hasura GraphQL Test",
        slug="hasura-graphql-detail-test",
        description="Instant GraphQL APIs",
        website="https://hasura.io",
        industry="DevTools",
        is_verified=True,
    )
    session.add(company)
    session.flush()

    office1 = Office(
        company_id=company.id,
        address="Koramangala 8th Block",
        locality="Koramangala",
        city="Bengaluru",
        latitude=12.9352,
        longitude=77.6245,
    )
    office2 = Office(
        company_id=company.id,
        address="Indiranagar 100 Feet Rd",
        locality="Indiranagar",
        city="Bengaluru",
        latitude=12.9719,
        longitude=77.6412,
    )
    session.add_all([office1, office2])
    session.flush()

    # Get Company Detail
    res_comp = client.get(f"/api/v1/companies/{company.id}")
    assert res_comp.status_code == 200
    comp_data = res_comp.json()
    assert comp_data["name"] == "Hasura GraphQL Test"
    assert comp_data["industry"] == "DevTools"

    # Get Company Offices
    res_offices = client.get(f"/api/v1/companies/{company.id}/offices")
    assert res_offices.status_code == 200
    offices_data = res_offices.json()
    assert len(offices_data) == 2
    localities = [o["locality"] for o in offices_data]
    assert "Koramangala" in localities
    assert "Indiranagar" in localities

    # 404 for non-existent company
    res_404_comp = client.get("/api/v1/companies/999999")
    assert res_404_comp.status_code == 404

    res_404_offices = client.get("/api/v1/companies/999999/offices")
    assert res_404_offices.status_code == 404


def test_query_parameters_validation(client_and_session):
    client, _ = client_and_session

    # Invalid page (< 1)
    res_bad_page = client.get("/api/v1/jobs?page=0")
    assert res_bad_page.status_code == 422

    # Invalid limit (> 100)
    res_bad_limit = client.get("/api/v1/jobs?limit=500")
    assert res_bad_limit.status_code == 422
