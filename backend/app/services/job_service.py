from typing import List, Optional
from sqlalchemy.orm import Session
from app.repositories.job_repository import JobRepository
from app.models.job import Job
from app.schemas.job import JobResponse, PaginatedJobsResponse, JobMapResponse


class JobService:
    def __init__(self, db: Session):
        self.repository = JobRepository(db)

    def get_job(self, job_id: int) -> Optional[Job]:
        return self.repository.get_by_id(job_id)

    def get_by_slug(self, slug: str) -> Optional[Job]:
        return self.repository.get_by_slug(slug)

    def list_jobs(
        self,
        page: int = 1,
        limit: int = 20,
        skip: Optional[int] = None,
        search: Optional[str] = None,
        skills: Optional[List[str]] = None,
        locality: Optional[str] = None,
        employment_type: Optional[str] = None,
        experience_level: Optional[str] = None,
        company: Optional[str] = None,
        company_id: Optional[int] = None,
        status: Optional[str] = "active",
        include_expired: bool = False,
    ) -> PaginatedJobsResponse:
        if skip is not None:
            actual_skip = skip
            actual_page = (skip // limit) + 1
        else:
            actual_skip = (page - 1) * limit
            actual_page = page

        items, total = self.repository.list_jobs(
            skip=actual_skip,
            limit=limit,
            search=search,
            skills=skills,
            locality=locality,
            employment_type=employment_type,
            experience_level=experience_level,
            company=company,
            company_id=company_id,
            status=status,
            include_expired=include_expired,
        )
        total_pages = (total + limit - 1) // limit if total > 0 else 0
        return PaginatedJobsResponse(
            items=[JobResponse.model_validate(j) for j in items],
            total=total,
            page=actual_page,
            limit=limit,
            total_pages=total_pages,
            has_next=actual_page < total_pages,
            has_prev=actual_page > 1,
        )

    def list_map_jobs(
        self,
        locality: Optional[str] = None,
        skills: Optional[List[str]] = None,
        search: Optional[str] = None,
        status: Optional[str] = "active",
        include_expired: bool = False,
    ) -> List[JobMapResponse]:
        jobs = self.repository.list_map_jobs(
            locality=locality,
            skills=skills,
            search=search,
            status=status,
            include_expired=include_expired,
        )
        return [JobMapResponse.model_validate(j) for j in jobs]

    def list_active(
        self, skip: int = 0, limit: int = 20, locality: Optional[str] = None
    ) -> List[Job]:
        return self.repository.list_active(skip=skip, limit=limit, locality=locality)
