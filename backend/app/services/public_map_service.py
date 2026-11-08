from typing import List, Optional
from sqlalchemy.orm import Session, selectinload
from sqlalchemy import func, or_
from app.models.company import Company
from app.models.office import Office
from app.models.job import Job
from app.schemas.public_map import PublicStatsResponse, OfficeLocationMapResponse, MapJobBrief


class PublicMapService:
    def __init__(self, db: Session):
        self.db = db

    def get_public_stats(self) -> PublicStatsResponse:
        """Computes live, accurate, database-backed statistics for the homepage."""
        approved_companies = (
            self.db.query(Company)
            .filter(Company.is_verified == True)
            .count()
        )
        office_locations = (
            self.db.query(Office)
            .join(Company, Office.company_id == Company.id)
            .filter(
                Company.is_verified == True,
                Office.latitude.isnot(None),
                Office.longitude.isnot(None),
            )
            .count()
        )
        active_jobs = (
            self.db.query(Job)
            .join(Company, Job.company_id == Company.id)
            .filter(
                Company.is_verified == True,
                Job.status == "active",
            )
            .count()
        )
        total_vacancies_res = (
            self.db.query(func.coalesce(func.sum(func.coalesce(Job.vacancies, 1)), 0))
            .join(Company, Job.company_id == Company.id)
            .filter(
                Company.is_verified == True,
                Job.status == "active",
            )
            .scalar()
        )
        total_vacancies = int(total_vacancies_res or 0)
        # In case active_jobs exist but vacancies default to 0 or 1, ensure at least active_jobs count
        if active_jobs > 0 and total_vacancies < active_jobs:
            total_vacancies = active_jobs

        return PublicStatsResponse(
            total_approved_companies=approved_companies,
            total_office_locations=office_locations,
            active_job_openings=active_jobs,
            total_vacancies=total_vacancies,
        )

    def get_public_map_locations(
        self,
        locality: Optional[str] = None,
        search: Optional[str] = None,
        skills: Optional[List[str]] = None,
    ) -> List[OfficeLocationMapResponse]:
        """
        Returns all approved company office coordinates for the public interactive map.
        Displays locations whether or not they currently have active vacancies,
        and clearly distinguishes active hiring premises from non-hiring premises.
        """
        query = (
            self.db.query(Office)
            .join(Company, Office.company_id == Company.id)
            .options(
                selectinload(Office.company),
                selectinload(Office.jobs),
            )
            .filter(
                Company.is_verified == True,
                Office.latitude.isnot(None),
                Office.longitude.isnot(None),
            )
        )

        if locality and locality.strip():
            query = query.filter(Office.locality.ilike(f"%{locality.strip()}%"))

        offices = query.all()
        results: List[OfficeLocationMapResponse] = []

        search_clean = search.strip().lower() if search and search.strip() else None
        skills_clean = [s.strip().lower() for s in skills if s.strip()] if skills else None

        for office in offices:
            comp = office.company
            if not comp or not comp.is_verified:
                continue

            # Active jobs at this specific office (or company-wide if not office-specific)
            active_jobs = [
                j for j in office.jobs
                if j.status == "active"
            ]

            # If search filter is active, check company name, locality, industry, or job titles/skills
            if search_clean:
                matches_company = (
                    search_clean in comp.name.lower()
                    or (comp.industry and search_clean in comp.industry.lower())
                    or (office.locality and search_clean in office.locality.lower())
                    or (office.address and search_clean in office.address.lower())
                )
                matches_job = any(
                    search_clean in j.title.lower()
                    or (j.skills and any(search_clean in sk.lower() for sk in j.skills))
                    or search_clean in j.description.lower()
                    for j in active_jobs
                )
                if not (matches_company or matches_job):
                    continue

            # If skills filter is active
            if skills_clean:
                matches_skills = any(
                    j.skills and any(req_s in [sk.lower() for sk in j.skills] for req_s in skills_clean)
                    for j in active_jobs
                )
                if not matches_skills:
                    continue

            job_briefs = [
                MapJobBrief(
                    id=j.id,
                    title=j.title,
                    slug=j.slug,
                    employment_type=j.employment_type,
                    work_mode=getattr(j, "work_mode", "in-office"),
                    experience_level=j.experience_level,
                    salary_min=j.salary_min,
                    salary_max=j.salary_max,
                    currency=j.currency or "INR",
                    vacancies=getattr(j, "vacancies", 1),
                    skills=j.skills,
                    status=j.status,
                )
                for j in active_jobs
            ]

            tot_vac = sum(getattr(j, "vacancies", 1) for j in active_jobs)
            has_vac = len(active_jobs) > 0

            results.append(
                OfficeLocationMapResponse(
                    office_id=office.id,
                    office_name=office.name,
                    company_id=comp.id,
                    company_name=comp.name,
                    company_slug=comp.slug,
                    company_logo_url=comp.logo_url,
                    industry=comp.industry,
                    address=office.address,
                    locality=office.locality,
                    city=office.city,
                    state=office.state,
                    postal_code=office.postal_code,
                    latitude=office.latitude,
                    longitude=office.longitude,
                    is_headquarters=office.is_headquarters,
                    is_verified=comp.is_verified,
                    has_active_vacancies=has_vac,
                    active_jobs_count=len(active_jobs),
                    total_vacancies=tot_vac,
                    jobs=job_briefs,
                )
            )

        return results
