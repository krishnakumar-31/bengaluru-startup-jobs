from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.services.job_service import JobService
from app.schemas.job import JobResponse, PaginatedJobsResponse, JobMapResponse

router = APIRouter()


@router.get("", response_model=PaginatedJobsResponse, summary="List Jobs")
def list_jobs(
    page: int = Query(default=1, ge=1, description="Page number"),
    limit: int = Query(default=20, ge=1, le=100, description="Items per page"),
    skip: Optional[int] = Query(default=None, ge=0, description="Items to skip (alternative to page)"),
    search: Optional[str] = Query(default=None, description="Search term for job title and description"),
    skills: Optional[str] = Query(default=None, description="Filter by skill keywords (comma-separated, e.g. 'Python,FastAPI')"),
    locality: Optional[str] = Query(default=None, description="Filter by office locality (e.g. Koramangala)"),
    employment_type: Optional[str] = Query(default=None, description="Filter by employment type (e.g. full-time)"),
    experience_level: Optional[str] = Query(default=None, description="Filter by experience level (e.g. senior)"),
    company: Optional[str] = Query(default=None, description="Filter by company name or slug"),
    company_id: Optional[int] = Query(default=None, description="Filter by company ID"),
    status_filter: Optional[str] = Query(default="active", alias="status", description="Filter by job status ('active', 'closed', or 'all')"),
    include_expired: bool = Query(default=False, description="Whether to include expired jobs"),
    db: Session = Depends(get_db),
) -> PaginatedJobsResponse:
    """Retrieve a paginated list of job postings with extensive filtering and full-text matching."""
    skill_list = [s.strip() for s in skills.split(",") if s.strip()] if skills else None
    service = JobService(db)
    return service.list_jobs(
        page=page,
        limit=limit,
        skip=skip,
        search=search,
        skills=skill_list,
        locality=locality,
        employment_type=employment_type,
        experience_level=experience_level,
        company=company,
        company_id=company_id,
        status=status_filter,
        include_expired=include_expired,
    )


@router.get("/map", response_model=List[JobMapResponse], summary="Get Jobs for Interactive Map")
def get_jobs_for_map(
    locality: Optional[str] = Query(default=None, description="Filter map pins by locality"),
    skills: Optional[str] = Query(default=None, description="Filter map pins by skills (comma-separated)"),
    search: Optional[str] = Query(default=None, description="Search term for map jobs"),
    status_filter: Optional[str] = Query(default="active", alias="status", description="Filter by job status"),
    include_expired: bool = Query(default=False, description="Whether to include expired jobs"),
    db: Session = Depends(get_db),
) -> List[JobMapResponse]:
    """Retrieve jobs located at verified office coordinates (latitude and longitude) for map rendering."""
    skill_list = [s.strip() for s in skills.split(",") if s.strip()] if skills else None
    service = JobService(db)
    return service.list_map_jobs(
        locality=locality,
        skills=skill_list,
        search=search,
        status=status_filter,
        include_expired=include_expired,
    )


@router.get("/{job_id}", response_model=JobResponse, summary="Get Job Details by ID")
def get_job(job_id: int, db: Session = Depends(get_db)) -> JobResponse:
    """Retrieve complete job posting details by its unique ID."""
    service = JobService(db)
    job = service.get_job(job_id)
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job with ID {job_id} not found",
        )
    return JobResponse.model_validate(job)
