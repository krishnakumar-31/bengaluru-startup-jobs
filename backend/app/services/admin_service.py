import csv
import io
import json
import re
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple
from fastapi import HTTPException, status
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func, desc, or_
from app.core.security import (
    verify_password,
    hash_password,
    create_access_token,
    generate_csrf_token,
    check_login_rate_limit,
    record_login_failure,
    clear_login_failures,
)
from app.models.admin_user import AdminUser
from app.models.company import Company
from app.models.office import Office
from app.models.job import Job
from app.models.job_source import JobSource
from app.schemas.admin import (
    AdminStatsOverview,
    AdminChartsResponse,
    ChartItem,
    AdminCompanyCreate,
    AdminCompanyUpdate,
    AdminOfficeCreate,
    AdminOfficeUpdate,
    AdminJobCreate,
    AdminJobUpdate,
    ImportPreviewResponse,
    ImportPreviewItem,
    ImportConfirmResponse,
    AdminVerificationResponse,
)
from app.schemas.company import CompanyResponse
from app.schemas.office import OfficeResponse
from app.schemas.job import JobResponse
from app.pipeline.validation.geo import (
    validate_bengaluru_coordinates,
    validate_bengaluru_postal_code,
)
from app.pipeline.validation.url import validate_web_url
from app.pipeline.validation.validator import slugify, PipelineValidator
from app.pipeline.importer.importer import DatabaseImporter


class AdminService:
    def __init__(self, db: Session):
        self.db = db

    # ==========================================
    # Authentication & Account Settings
    # ==========================================

    def authenticate_admin(self, username: str, plain_password: str, client_ip: str) -> Tuple[str, str, AdminUser]:
        """Authenticate single super admin with brute-force rate limiting."""
        rate_limit_key = f"{client_ip}:{username}"
        check_login_rate_limit(rate_limit_key)

        admin = self.db.query(AdminUser).filter(AdminUser.username == username).first()
        if not admin or not admin.is_active or not verify_password(plain_password, admin.hashed_password):
            record_login_failure(rate_limit_key)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid administrator credentials.",
            )

        clear_login_failures(rate_limit_key)

        # Update last login timestamp
        admin.last_login_at = datetime.now(timezone.utc)
        self.db.commit()
        self.db.refresh(admin)

        csrf_token = generate_csrf_token()
        jwt_token = create_access_token(
            subject=admin.username,
            token_version=admin.token_version,
            csrf_token=csrf_token,
        )
        return jwt_token, csrf_token, admin

    def change_password(self, admin_user: AdminUser, current_password: str, new_password: str) -> AdminUser:
        """Change admin password and increment token_version to invalidate previous sessions."""
        if not verify_password(current_password, admin_user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password verification failed.",
            )

        admin_user.hashed_password = hash_password(new_password)
        admin_user.token_version += 1  # Invalidate all prior JWT tokens immediately
        self.db.commit()
        self.db.refresh(admin_user)
        return admin_user

    # ==========================================
    # Dashboard Analytics & Live Statistics
    # ==========================================

    def get_stats_overview(self) -> AdminStatsOverview:
        """Fetch live PostgreSQL overview counts and recently added records."""
        total_companies = self.db.query(Company).count()
        verified_companies = self.db.query(Company).filter(Company.is_verified == True).count()
        unverified_companies = total_companies - verified_companies

        total_offices = self.db.query(Office).count()
        total_jobs = self.db.query(Job).count()
        active_jobs = self.db.query(Job).filter(Job.status == "active").count()
        expired_jobs = self.db.query(Job).filter(Job.status == "expired").count()

        # Jobs requiring verification: jobs without any sources or with empty source_url
        unverified_jobs = (
            self.db.query(Job)
            .outerjoin(Job.sources)
            .filter(or_(JobSource.id == None, JobSource.source_url == None, JobSource.source_url == ""))
            .count()
        )

        recent_companies_orm = (
            self.db.query(Company)
            .options(selectinload(Company.offices))
            .order_by(desc(Company.created_at))
            .limit(5)
            .all()
        )
        recent_companies = [CompanyResponse.model_validate(c) for c in recent_companies_orm]

        recent_jobs_orm = (
            self.db.query(Job)
            .options(selectinload(Job.company), selectinload(Job.office), selectinload(Job.sources))
            .order_by(desc(Job.created_at))
            .limit(5)
            .all()
        )
        recent_jobs = [JobResponse.model_validate(j) for j in recent_jobs_orm]

        return AdminStatsOverview(
            total_companies=total_companies,
            verified_companies=verified_companies,
            unverified_companies=unverified_companies,
            total_offices=total_offices,
            total_jobs=total_jobs,
            active_jobs=active_jobs,
            expired_jobs=expired_jobs,
            unverified_jobs=unverified_jobs,
            recent_companies=recent_companies,
            recent_jobs=recent_jobs,
        )

    def get_charts_data(self) -> AdminChartsResponse:
        """Generate distribution charts data from live PostgreSQL database."""
        # 1. Companies by industry
        comp_ind_rows = (
            self.db.query(func.coalesce(Company.industry, "Other"), func.count(Company.id))
            .group_by(func.coalesce(Company.industry, "Other"))
            .order_by(desc(func.count(Company.id)))
            .all()
        )
        total_comps = sum(c for _, c in comp_ind_rows) or 1
        companies_by_industry = [
            ChartItem(label=label, count=cnt, percentage=round((cnt / total_comps) * 100, 1))
            for label, cnt in comp_ind_rows
        ]

        # 2. Jobs by industry
        job_ind_rows = (
            self.db.query(func.coalesce(Company.industry, "Other"), func.count(Job.id))
            .join(Company, Job.company_id == Company.id)
            .group_by(func.coalesce(Company.industry, "Other"))
            .order_by(desc(func.count(Job.id)))
            .all()
        )
        total_jobs = sum(c for _, c in job_ind_rows) or 1
        jobs_by_industry = [
            ChartItem(label=label, count=cnt, percentage=round((cnt / total_jobs) * 100, 1))
            for label, cnt in job_ind_rows
        ]

        # 3. Jobs by locality
        loc_rows = (
            self.db.query(func.coalesce(Office.locality, "Unspecified"), func.count(Job.id))
            .outerjoin(Office, Job.office_id == Office.id)
            .group_by(func.coalesce(Office.locality, "Unspecified"))
            .order_by(desc(func.count(Job.id)))
            .all()
        )
        total_loc_jobs = sum(c for _, c in loc_rows) or 1
        jobs_by_locality = [
            ChartItem(label=label, count=cnt, percentage=round((cnt / total_loc_jobs) * 100, 1))
            for label, cnt in loc_rows
        ]

        # 4. Jobs by status (normalized case-insensitive grouping to avoid duplicate label buckets)
        status_expr = func.lower(func.coalesce(Job.status, "draft"))
        status_rows = (
            self.db.query(status_expr, func.count(Job.id))
            .group_by(status_expr)
            .order_by(desc(func.count(Job.id)))
            .all()
        )
        total_status_jobs = sum(c for _, c in status_rows) or 1
        jobs_by_status = [
            ChartItem(label=label.capitalize(), count=cnt, percentage=round((cnt / total_status_jobs) * 100, 1))
            for label, cnt in status_rows
        ]

        return AdminChartsResponse(
            companies_by_industry=companies_by_industry,
            jobs_by_industry=jobs_by_industry,
            jobs_by_locality=jobs_by_locality,
            jobs_by_status=jobs_by_status,
        )

    # ==========================================
    # Company Management (with record protection)
    # ==========================================

    def list_companies(
        self,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        industry: Optional[str] = None,
        is_verified: Optional[bool] = None,
    ) -> Tuple[List[Company], int]:
        query = self.db.query(Company)
        if search:
            term = f"%{search.strip()}%"
            query = query.filter(
                or_(Company.name.ilike(term), Company.slug.ilike(term), Company.description.ilike(term))
            )
        if industry:
            query = query.filter(Company.industry.ilike(f"%{industry.strip()}%"))
        if is_verified is not None:
            query = query.filter(Company.is_verified == is_verified)

        total = query.count()
        items = (
            query.options(selectinload(Company.offices), selectinload(Company.jobs))
            .order_by(Company.name.asc())
            .offset((page - 1) * limit)
            .limit(limit)
            .all()
        )
        return items, total

    def create_company(self, data: AdminCompanyCreate) -> Company:
        slug = (data.slug or slugify(data.name)).strip().lower()
        if self.db.query(Company).filter(Company.slug == slug).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Company with slug '{slug}' already exists.",
            )

        company = Company(
            name=data.name.strip(),
            slug=slug,
            cin=data.cin.strip() if data.cin else None,
            description=data.description,
            website=data.website,
            email=data.email,
            phone=data.phone,
            logo_url=data.logo_url,
            industry=data.industry,
            company_size=data.company_size,
            founded_year=data.founded_year,
            is_verified=data.is_verified,
        )
        self.db.add(company)
        self.db.commit()
        self.db.refresh(company)
        return company

    def get_company(self, company_id: int) -> Company:
        company = (
            self.db.query(Company)
            .options(selectinload(Company.offices), selectinload(Company.jobs))
            .filter(Company.id == company_id)
            .first()
        )
        if not company:
            raise HTTPException(status_code=404, detail=f"Company with ID {company_id} not found.")
        return company

    def update_company(self, company_id: int, data: AdminCompanyUpdate) -> Company:
        company = self.get_company(company_id)
        if data.name is not None:
            company.name = data.name.strip()
        if data.slug is not None:
            slug = slugify(data.slug)
            existing = self.db.query(Company).filter(Company.slug == slug, Company.id != company_id).first()
            if existing:
                raise HTTPException(status_code=400, detail=f"Company with slug '{slug}' already exists.")
            company.slug = slug
        if data.description is not None:
            company.description = data.description
        if data.cin is not None:
            company.cin = data.cin.strip() if data.cin else None
        if data.website is not None:
            company.website = data.website
        if data.email is not None:
            company.email = data.email
        if data.phone is not None:
            company.phone = data.phone
        if data.logo_url is not None:
            company.logo_url = data.logo_url
        if data.industry is not None:
            company.industry = data.industry
        if data.company_size is not None:
            company.company_size = data.company_size
        if data.founded_year is not None:
            company.founded_year = data.founded_year
        if data.is_verified is not None:
            company.is_verified = data.is_verified

        self.db.commit()
        self.db.refresh(company)
        return company

    def delete_company(self, company_id: int, force: bool = False) -> None:
        """
        Protected Company Deletion:
        Prevents accidental deletion of companies with dependent offices or jobs unless explicitly forced.
        """
        company = self.get_company(company_id)
        offices_count = len(company.offices)
        jobs_count = len(company.jobs)

        if (offices_count > 0 or jobs_count > 0) and not force:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Protected record: Company '{company.name}' has {offices_count} office(s) and {jobs_count} job(s). "
                    f"Please reassign or remove dependent records first, or confirm force delete."
                ),
            )

        self.db.delete(company)
        self.db.commit()

    def toggle_company_verification(self, company_id: int) -> Company:
        company = self.get_company(company_id)
        company.is_verified = not company.is_verified
        self.db.commit()
        self.db.refresh(company)
        return company

    # ==========================================
    # Office Management (with Greater Bengaluru validation)
    # ==========================================

    def list_offices(
        self,
        page: int = 1,
        limit: int = 50,
        company_id: Optional[int] = None,
        locality: Optional[str] = None,
    ) -> Tuple[List[Office], int]:
        query = self.db.query(Office).options(selectinload(Office.company))
        if company_id:
            query = query.filter(Office.company_id == company_id)
        if locality:
            query = query.filter(Office.locality.ilike(f"%{locality.strip()}%"))

        total = query.count()
        items = query.order_by(Office.locality.asc()).offset((page - 1) * limit).limit(limit).all()
        return items, total

    def create_office(self, data: AdminOfficeCreate) -> Office:
        # Validate company exists
        company = self.db.query(Company).filter(Company.id == data.company_id).first()
        if not company:
            raise HTTPException(status_code=400, detail=f"Company with ID {data.company_id} does not exist.")

        # Validate coordinates against Greater Bengaluru bounding box if provided
        if data.latitude is not None or data.longitude is not None:
            if data.latitude is None or data.longitude is None:
                raise HTTPException(status_code=400, detail="Both latitude and longitude must be provided.")
            is_valid_geo, geo_err = validate_bengaluru_coordinates(data.latitude, data.longitude)
            if not is_valid_geo:
                raise HTTPException(status_code=400, detail=f"Coordinates outside Greater Bengaluru bounds: {geo_err}")

        # Validate postal code if provided
        if data.postal_code:
            is_valid_pin, pin_err = validate_bengaluru_postal_code(data.postal_code)
            if not is_valid_pin:
                raise HTTPException(status_code=400, detail=f"Invalid Bengaluru postal code: {pin_err}")

        office = Office(
            company_id=data.company_id,
            name=data.name.strip() if data.name else None,
            address=data.address,
            locality=data.locality.strip(),
            city=data.city.strip() or "Bengaluru",
            state=data.state.strip() or "Karnataka",
            postal_code=data.postal_code.strip() if data.postal_code else None,
            latitude=data.latitude,
            longitude=data.longitude,
            is_headquarters=data.is_headquarters,
        )
        self.db.add(office)
        self.db.commit()
        self.db.refresh(office)
        return office

    def get_office(self, office_id: int) -> Office:
        office = (
            self.db.query(Office)
            .options(selectinload(Office.company), selectinload(Office.jobs))
            .filter(Office.id == office_id)
            .first()
        )
        if not office:
            raise HTTPException(status_code=404, detail=f"Office with ID {office_id} not found.")
        return office

    def update_office(self, office_id: int, data: AdminOfficeUpdate) -> Office:
        office = self.get_office(office_id)
        if data.company_id is not None:
            comp = self.db.query(Company).filter(Company.id == data.company_id).first()
            if not comp:
                raise HTTPException(status_code=400, detail=f"Company ID {data.company_id} not found.")
            office.company_id = data.company_id

        if data.latitude is not None or data.longitude is not None:
            lat = data.latitude if data.latitude is not None else office.latitude
            lng = data.longitude if data.longitude is not None else office.longitude
            if lat is not None and lng is not None:
                is_valid_geo, geo_err = validate_bengaluru_coordinates(lat, lng)
                if not is_valid_geo:
                    raise HTTPException(status_code=400, detail=f"Invalid coordinates: {geo_err}")
                office.latitude = lat
                office.longitude = lng

        if data.postal_code is not None:
            if data.postal_code.strip():
                is_valid_pin, pin_err = validate_bengaluru_postal_code(data.postal_code)
                if not is_valid_pin:
                    raise HTTPException(status_code=400, detail=f"Invalid Bengaluru postal code: {pin_err}")
                office.postal_code = data.postal_code.strip()
            else:
                office.postal_code = None

        if data.name is not None:
            office.name = data.name.strip() if data.name else None
        if data.is_headquarters is not None:
            office.is_headquarters = data.is_headquarters
        if data.address is not None:
            office.address = data.address
        if data.locality is not None:
            office.locality = data.locality.strip()
        if data.city is not None:
            office.city = data.city.strip()
        if data.state is not None:
            office.state = data.state.strip()

        self.db.commit()
        self.db.refresh(office)
        return office

    def delete_office(self, office_id: int, force: bool = False) -> None:
        """Protected Office Deletion."""
        office = self.get_office(office_id)
        jobs_count = len(office.jobs)
        if jobs_count > 0 and not force:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Protected record: Office has {jobs_count} job(s) assigned to it. Please reassign jobs first or specify force delete.",
            )
        self.db.delete(office)
        self.db.commit()

    # ==========================================
    # Job Management (with validation & safety)
    # ==========================================

    def list_jobs(
        self,
        page: int = 1,
        limit: int = 20,
        search: Optional[str] = None,
        company_id: Optional[int] = None,
        locality: Optional[str] = None,
        employment_type: Optional[str] = None,
        work_mode: Optional[str] = None,
        status_filter: Optional[str] = None,
    ) -> Tuple[List[Job], int]:
        query = self.db.query(Job).options(
            selectinload(Job.company),
            selectinload(Job.office),
            selectinload(Job.sources),
        )
        if search:
            term = f"%{search.strip()}%"
            query = query.filter(or_(Job.title.ilike(term), Job.description.ilike(term), Job.slug.ilike(term)))
        if company_id:
            query = query.filter(Job.company_id == company_id)
        if locality:
            query = query.join(Job.office).filter(Office.locality.ilike(f"%{locality.strip()}%"))
        if employment_type and employment_type != "all":
            query = query.filter(Job.employment_type.ilike(f"%{employment_type.strip()}%"))
        if work_mode and work_mode != "all":
            query = query.filter(Job.work_mode == work_mode)
        if status_filter and status_filter != "all":
            query = query.filter(Job.status == status_filter)

        total = query.count()
        items = query.order_by(desc(Job.created_at)).offset((page - 1) * limit).limit(limit).all()
        return items, total

    def create_job(self, data: AdminJobCreate) -> Job:
        # Validate company exists
        company = self.db.query(Company).filter(Company.id == data.company_id).first()
        if not company:
            raise HTTPException(status_code=400, detail=f"Company with ID {data.company_id} does not exist.")

        # Validate office belongs to selected company
        if data.office_id:
            office = self.db.query(Office).filter(Office.id == data.office_id).first()
            if not office or office.company_id != data.company_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Office ID {data.office_id} does not belong to company '{company.name}' (ID {data.company_id}).",
                )

        # Validate salary min <= max
        if data.salary_min is not None and data.salary_max is not None:
            if data.salary_min > data.salary_max:
                raise HTTPException(status_code=400, detail="Minimum salary cannot exceed maximum salary.")

        # Validate URLs if provided
        if data.application_url:
            valid_url, url_err = validate_web_url(data.application_url)
            if not valid_url:
                raise HTTPException(status_code=400, detail=f"Invalid application URL: {url_err}")

        slug = (data.slug or f"{company.slug}-{slugify(data.title)}").strip().lower()
        if self.db.query(Job).filter(Job.slug == slug).first():
            slug = f"{slug}-{int(datetime.now().timestamp())}"

        job = Job(
            company_id=data.company_id,
            office_id=data.office_id,
            title=data.title.strip(),
            slug=slug,
            description=data.description,
            employment_type=data.employment_type,
            work_mode=data.work_mode,
            vacancies=data.vacancies,
            experience_level=data.experience_level,
            experience_min=data.experience_min,
            experience_max=data.experience_max,
            salary_min=data.salary_min,
            salary_max=data.salary_max,
            currency=data.currency or "INR",
            skills=data.skills,
            application_url=data.application_url,
            job_source_url=data.job_source_url or data.source_url,
            status=data.status,
            posted_at=data.posted_at or datetime.now(timezone.utc),
            expires_at=data.expires_at,
        )
        self.db.add(job)
        self.db.flush()

        # Add JobSource record if source_url provided
        if data.source_url:
            valid_src, src_err = validate_web_url(data.source_url)
            if not valid_src:
                raise HTTPException(status_code=400, detail=f"Invalid source URL: {src_err}")
            source = JobSource(
                job_id=job.id,
                source_name="admin_entry",
                source_url=data.source_url,
                last_verified_at=datetime.now(timezone.utc),
            )
            self.db.add(source)

        self.db.commit()
        self.db.refresh(job)
        return job

    def get_job(self, job_id: int) -> Job:
        job = (
            self.db.query(Job)
            .options(selectinload(Job.company), selectinload(Job.office), selectinload(Job.sources))
            .filter(Job.id == job_id)
            .first()
        )
        if not job:
            raise HTTPException(status_code=404, detail=f"Job with ID {job_id} not found.")
        return job

    def update_job(self, job_id: int, data: AdminJobUpdate) -> Job:
        job = self.get_job(job_id)
        if data.company_id is not None:
            comp = self.db.query(Company).filter(Company.id == data.company_id).first()
            if not comp:
                raise HTTPException(status_code=400, detail=f"Company ID {data.company_id} not found.")
            job.company_id = data.company_id

        if data.office_id is not None:
            target_company_id = data.company_id or job.company_id
            office = self.db.query(Office).filter(Office.id == data.office_id).first()
            if not office or office.company_id != target_company_id:
                raise HTTPException(status_code=400, detail="Office does not belong to selected company.")
            job.office_id = data.office_id

        if data.title is not None:
            job.title = data.title.strip()
        if data.description is not None:
            job.description = data.description
        if data.employment_type is not None:
            job.employment_type = data.employment_type
        if data.work_mode is not None:
            job.work_mode = data.work_mode
        if data.vacancies is not None:
            job.vacancies = data.vacancies
        if data.experience_level is not None:
            job.experience_level = data.experience_level
        if data.experience_min is not None:
            job.experience_min = data.experience_min
        if data.experience_max is not None:
            job.experience_max = data.experience_max
        if data.skills is not None:
            job.skills = data.skills
        if data.currency is not None:
            job.currency = data.currency
        if data.job_source_url is not None:
            job.job_source_url = data.job_source_url
        if data.status is not None:
            job.status = data.status

        # Update salary min / max
        new_min = data.salary_min if data.salary_min is not None else job.salary_min
        new_max = data.salary_max if data.salary_max is not None else job.salary_max
        if new_min is not None and new_max is not None and new_min > new_max:
            raise HTTPException(status_code=400, detail="Minimum salary cannot exceed maximum salary.")
        if data.salary_min is not None:
            job.salary_min = data.salary_min
        if data.salary_max is not None:
            job.salary_max = data.salary_max

        if data.application_url is not None:
            if data.application_url.strip():
                valid_url, url_err = validate_web_url(data.application_url)
                if not valid_url:
                    raise HTTPException(status_code=400, detail=f"Invalid application URL: {url_err}")
                job.application_url = data.application_url.strip()
            else:
                job.application_url = None

        if data.expires_at is not None:
            job.expires_at = data.expires_at

        self.db.commit()
        self.db.refresh(job)
        return job

    def set_job_status(self, job_id: int, new_status: str) -> Job:
        job = self.get_job(job_id)
        job.status = new_status
        self.db.commit()
        self.db.refresh(job)
        return job

    def delete_job(self, job_id: int) -> None:
        job = self.get_job(job_id)
        self.db.delete(job)
        self.db.commit()

    # ==========================================
    # Verification & Data Import
    # ==========================================

    def get_verification_hub(self) -> AdminVerificationResponse:
        unverified_comps = (
            self.db.query(Company)
            .options(selectinload(Company.offices))
            .filter(Company.is_verified == False)
            .all()
        )
        unverified_jobs = (
            self.db.query(Job)
            .options(selectinload(Job.company), selectinload(Job.office), selectinload(Job.sources))
            .outerjoin(Job.sources)
            .filter(or_(JobSource.id == None, JobSource.source_url == None, JobSource.source_url == ""))
            .all()
        )
        expired_jobs = (
            self.db.query(Job)
            .options(selectinload(Job.company), selectinload(Job.office), selectinload(Job.sources))
            .filter(Job.status == "expired")
            .all()
        )

        return AdminVerificationResponse(
            unverified_companies=[CompanyResponse.model_validate(c) for c in unverified_comps],
            unverified_jobs=[JobResponse.model_validate(j) for j in unverified_jobs],
            expired_jobs=[JobResponse.model_validate(j) for j in expired_jobs],
        )

    def preview_import_file(self, content_str: str, file_type: str) -> ImportPreviewResponse:
        """Parses CSV or JSON content to preview accepted vs rejected records."""
        if file_type == "csv":
            from app.services.unified_import_service import UnifiedImportService
            unified_svc = UnifiedImportService(self.db)
            return unified_svc.validate_and_preview_csv(content_str)

        from app.pipeline.models import (
            RawCompanyData,
            RawOfficeData,
            RawJobData,
            RawStartupRecord,
            ValidatedStartupRecord,
        )

        validator = PipelineValidator()
        raw_records: List[RawStartupRecord] = []

        if file_type == "json":
            try:
                data = json.loads(content_str)
                items = data.get("companies", data) if isinstance(data, dict) else data
                if not isinstance(items, list):
                    items = [items]

                for item in items:
                    # Support both nested company format and flat company format
                    if "company" in item:
                        c_dict = item["company"]
                    else:
                        c_dict = {
                            "name": item.get("name", ""),
                            "slug": item.get("slug") or slugify(item.get("name", "")),
                            "description": item.get("description", "Innovative Bengaluru startup."),
                            "website": item.get("website", item.get("website_url", "")),
                            "logo_url": item.get("logo_url"),
                            "industry": item.get("industry", "Technology"),
                            "company_size": item.get("company_size"),
                            "founded_year": item.get("founded_year"),
                            "is_verified": item.get("is_verified", True),
                        }

                    offices_list = []
                    for off in item.get("offices", []):
                        offices_list.append(RawOfficeData(
                            address=off.get("address", f"Tech Park, {off.get('locality', 'Bengaluru')}"),
                            locality=off.get("locality", "Koramangala"),
                            city=off.get("city", "Bengaluru"),
                            state=off.get("state", "Karnataka"),
                            postal_code=off.get("postal_code", "560034"),
                            latitude=off.get("latitude"),
                            longitude=off.get("longitude"),
                        ))

                    jobs_list = []
                    for j in item.get("jobs", []):
                        jobs_list.append(RawJobData(
                            title=j.get("title", "Software Engineer"),
                            description=j.get("description", "Engineering role in Bengaluru."),
                            slug=j.get("slug") or slugify(f"{c_dict.get('name')}-{j.get('title')}"),
                            employment_type=j.get("employment_type", "full-time"),
                            experience_level=j.get("experience_level", "mid"),
                            salary_min=j.get("salary_min"),
                            salary_max=j.get("salary_max"),
                            currency=j.get("currency", "INR"),
                            skills=j.get("skills", []),
                            application_url=j.get("application_url", c_dict.get("website", "https://example.com")),
                            status=j.get("status", "active"),
                            source_name="admin_import",
                            source_url=j.get("source_url", j.get("application_url", c_dict.get("website", "https://example.com"))),
                            posted_at=j.get("posted_at"),
                            expires_at=j.get("expires_at"),
                        ))

                    raw_records.append(RawStartupRecord(
                        company=RawCompanyData(**c_dict),
                        offices=offices_list,
                        jobs=jobs_list,
                    ))
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Malformed JSON file: {e}")
        elif file_type == "csv":
            try:
                reader = csv.DictReader(io.StringIO(content_str))
                for row in reader:
                    comp_name = row.get("company_name", row.get("name", "")).strip()
                    if not comp_name:
                        continue

                    company_data = RawCompanyData(
                        name=comp_name,
                        slug=row.get("slug") or slugify(comp_name),
                        website=row.get("website", row.get("website_url", "https://example.com")),
                        industry=row.get("industry", "Technology"),
                        description=row.get("description", "Technology company in Bengaluru."),
                        is_verified=True,
                    )

                    locality = row.get("locality", "Bengaluru")
                    offices_list = [
                        RawOfficeData(
                            address=row.get("address", f"Tech Hub, {locality}"),
                            locality=locality,
                            city=row.get("city", "Bengaluru"),
                            state=row.get("state", "Karnataka"),
                            postal_code=row.get("postal_code", row.get("pincode", "560001")),
                            latitude=float(row["latitude"]) if row.get("latitude") else None,
                            longitude=float(row["longitude"]) if row.get("longitude") else None,
                        )
                    ]

                    jobs_list = []
                    job_title = row.get("job_title", row.get("title", "")).strip()
                    if job_title:
                        app_url = row.get("application_url", row.get("career_url", company_data.website))
                        jobs_list.append(RawJobData(
                            title=job_title,
                            slug=slugify(f"{comp_name}-{job_title}"),
                            description=row.get("job_description", row.get("description", job_title)),
                            employment_type=row.get("employment_type", "full-time"),
                            application_url=app_url,
                            source_name="admin_csv_import",
                            source_url=row.get("source_url", app_url),
                        ))

                    raw_records.append(RawStartupRecord(
                        company=company_data,
                        offices=offices_list,
                        jobs=jobs_list,
                    ))
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Malformed CSV file: {e}")
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload CSV or JSON.")

        # Run pipeline batch validation
        batch = validator.validate_batch(raw_records)
        preview_items: List[ImportPreviewItem] = []

        for val_rec in batch.accepted:
            loc = val_rec.offices[0].locality if val_rec.offices else "Bengaluru"
            title = val_rec.jobs[0].title if val_rec.jobs else None
            preview_items.append(ImportPreviewItem(
                company_name=val_rec.company.name,
                company_slug=val_rec.company.slug,
                locality=loc,
                job_title=title,
                valid=True,
                issues=[],
            ))

        for rej_rec in batch.rejected:
            preview_items.append(ImportPreviewItem(
                company_name=rej_rec.company_name or "Unknown Company",
                company_slug=slugify(rej_rec.company_name or "unknown"),
                locality=None,
                job_title=None,
                valid=False,
                issues=[f"{iss.field}: {iss.message}" for iss in rej_rec.issues],
            ))

        serialized_accepted = json.dumps([c.model_dump(mode="json") for c in batch.accepted])

        return ImportPreviewResponse(
            total_records=len(preview_items),
            accepted_count=len(batch.accepted),
            rejected_count=len(batch.rejected),
            items=preview_items,
            raw_accepted_json=serialized_accepted,
        )

    def confirm_import(self, raw_accepted_json: str) -> ImportConfirmResponse:
        """Runs UnifiedImportService or DatabaseImporter to ingest verified preview records."""
        try:
            items_dict = json.loads(raw_accepted_json)
            # If records have unified import format with 'company' dict and 'office'
            if isinstance(items_dict, list) and len(items_dict) > 0:
                first = items_dict[0]
                if isinstance(first, dict) and "company" in first and isinstance(first["company"], dict) and "is_verified" in first["company"]:
                    from app.services.unified_import_service import UnifiedImportService
                    unified_svc = UnifiedImportService(self.db)
                    return unified_svc.execute_unified_import(raw_accepted_json)
        except HTTPException:
            raise
        except Exception:
            pass

        from app.pipeline.models import ValidatedStartupRecord
        try:
            items_dict = json.loads(raw_accepted_json)
            validated_records = [ValidatedStartupRecord.model_validate(d) for d in items_dict]
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f"Failed to parse validated import data: {exc}")

        importer = DatabaseImporter(self.db)
        report = importer.import_records(validated_records)

        return ImportConfirmResponse(
            companies_created=report.companies_created,
            companies_updated=report.companies_updated,
            offices_created=report.offices_created,
            offices_updated=report.offices_updated,
            jobs_created=report.jobs_created,
            jobs_updated=report.jobs_updated,
            skipped_count=0,
            rejected_count=0,
            message="Import completed successfully.",
        )
