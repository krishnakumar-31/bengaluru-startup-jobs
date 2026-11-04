import time
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.models.company import Company
from app.models.job import Job
from app.models.job_source import JobSource
from app.models.office import Office
from app.pipeline.models import ImportReport, ValidatedStartupRecord


class DatabaseImporter:
    """Transactional, idempotent importer that synchronizes validated startup records

    into PostgreSQL using existing SQLAlchemy models and relationships.
    """

    def __init__(self, db: Session):
        self.db = db

    def import_batch(
        self,
        records: List[ValidatedStartupRecord],
        dry_run: bool = False,
    ) -> ImportReport:
        """Import or update a list of validated startup records into PostgreSQL.

        If dry_run is True, validates and tests database execution in a transaction
        that is always rolled back at the end.
        """
        start_time = time.perf_counter()
        report = ImportReport(total_records_processed=len(records))

        try:
            for record in records:
                self._import_record(record, report)

            if dry_run:
                self.db.rollback()
            else:
                self.db.commit()

        except Exception as e:
            self.db.rollback()
            report.errors.append(f"Database transaction aborted: {str(e)}")

        report.duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        return report

    def _import_record(
        self, record: ValidatedStartupRecord, report: ImportReport
    ) -> None:
        """Import or update a single validated startup record."""
        # 1. Upsert Company
        company = self._upsert_company(record, report)
        self.db.flush()

        # 2. Upsert Offices
        office_map = {}
        first_office = None
        for off_data in record.offices:
            office = self._upsert_office(company.id, off_data, report)
            self.db.flush()
            if not first_office:
                first_office = office
            office_map[off_data.locality.lower()] = office

        # 3. Upsert Jobs and Sources
        for job_data in record.jobs:
            target_office = None
            if job_data.office_locality and job_data.office_locality.lower() in office_map:
                target_office = office_map[job_data.office_locality.lower()]
            elif first_office:
                target_office = first_office

            job = self._upsert_job(company.id, target_office, job_data, report)
            self.db.flush()

            self._upsert_job_source(job.id, job_data, report)
            self.db.flush()

    def _upsert_company(
        self, record: ValidatedStartupRecord, report: ImportReport
    ) -> Company:
        c_data = record.company
        existing = (
            self.db.query(Company)
            .filter(
                or_(
                    Company.slug == c_data.slug,
                    Company.website == c_data.website,
                    Company.name.ilike(c_data.name),
                )
            )
            .first()
        )

        if existing:
            # Update attributes
            existing.name = c_data.name
            existing.description = c_data.description
            existing.website = c_data.website
            if c_data.logo_url:
                existing.logo_url = c_data.logo_url
            existing.industry = c_data.industry
            if c_data.company_size:
                existing.company_size = c_data.company_size
            if c_data.founded_year is not None:
                existing.founded_year = c_data.founded_year
            existing.is_verified = c_data.is_verified
            report.companies_updated += 1
            return existing
        else:
            new_comp = Company(
                name=c_data.name,
                slug=c_data.slug,
                description=c_data.description,
                website=c_data.website,
                logo_url=c_data.logo_url,
                industry=c_data.industry,
                company_size=c_data.company_size,
                founded_year=c_data.founded_year,
                is_verified=c_data.is_verified,
            )
            self.db.add(new_comp)
            report.companies_created += 1
            return new_comp

    def _upsert_office(
        self, company_id: int, off_data, report: ImportReport
    ) -> Office:
        existing = (
            self.db.query(Office)
            .filter(
                Office.company_id == company_id,
                or_(
                    Office.address == off_data.address,
                    Office.locality.ilike(off_data.locality),
                ),
            )
            .first()
        )

        if existing:
            existing.address = off_data.address
            existing.locality = off_data.locality
            existing.city = off_data.city
            existing.state = off_data.state
            existing.postal_code = off_data.postal_code
            existing.latitude = off_data.latitude
            existing.longitude = off_data.longitude
            report.offices_updated += 1
            return existing
        else:
            new_office = Office(
                company_id=company_id,
                address=off_data.address,
                locality=off_data.locality,
                city=off_data.city,
                state=off_data.state,
                postal_code=off_data.postal_code,
                latitude=off_data.latitude,
                longitude=off_data.longitude,
            )
            self.db.add(new_office)
            report.offices_created += 1
            return new_office

    def _upsert_job(
        self,
        company_id: int,
        office: Optional[Office],
        job_data,
        report: ImportReport,
    ) -> Job:
        office_id = office.id if office else None

        existing = (
            self.db.query(Job)
            .filter(
                or_(
                    Job.slug == job_data.slug,
                    Job.application_url == job_data.application_url,
                    (
                        (Job.company_id == company_id)
                        & (Job.title == job_data.title)
                        & (Job.office_id == office_id)
                    ),
                )
            )
            .first()
        )

        if existing:
            existing.title = job_data.title
            existing.description = job_data.description
            existing.office_id = office_id
            existing.employment_type = job_data.employment_type
            existing.experience_level = job_data.experience_level
            existing.salary_min = job_data.salary_min
            existing.salary_max = job_data.salary_max
            existing.currency = job_data.currency
            existing.skills = job_data.skills
            existing.application_url = job_data.application_url
            existing.status = job_data.status
            if job_data.posted_at:
                existing.posted_at = job_data.posted_at
            if job_data.expires_at:
                existing.expires_at = job_data.expires_at
            report.jobs_updated += 1
            return existing
        else:
            new_job = Job(
                company_id=company_id,
                office_id=office_id,
                title=job_data.title,
                slug=job_data.slug,
                description=job_data.description,
                employment_type=job_data.employment_type,
                experience_level=job_data.experience_level,
                salary_min=job_data.salary_min,
                salary_max=job_data.salary_max,
                currency=job_data.currency,
                skills=job_data.skills,
                application_url=job_data.application_url,
                status=job_data.status,
                posted_at=job_data.posted_at or datetime.now(timezone.utc),
                expires_at=job_data.expires_at,
            )
            self.db.add(new_job)
            report.jobs_created += 1
            return new_job

    def _upsert_job_source(
        self, job_id: int, job_data, report: ImportReport
    ) -> JobSource:
        existing = (
            self.db.query(JobSource)
            .filter(
                JobSource.job_id == job_id,
                JobSource.source_url == job_data.source_url,
            )
            .first()
        )

        now = datetime.now(timezone.utc)
        if existing:
            existing.source_name = job_data.source_name
            existing.last_verified_at = now
            report.sources_updated += 1
            return existing
        else:
            new_src = JobSource(
                job_id=job_id,
                source_name=job_data.source_name,
                source_url=job_data.source_url,
                last_verified_at=now,
            )
            self.db.add(new_src)
            report.sources_created += 1
            return new_src
