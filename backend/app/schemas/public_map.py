from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class PublicStatsResponse(BaseModel):
    """Accurate database-backed statistics for homepage and header."""
    total_approved_companies: int
    total_office_locations: int
    active_job_openings: int
    total_vacancies: int


class MapJobBrief(BaseModel):
    """Brief job listing embedded in an office map pin popup."""
    id: int
    title: str
    slug: str
    employment_type: str
    work_mode: str = "in-office"
    experience_level: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    currency: Optional[str] = "INR"
    vacancies: int = 1
    skills: Optional[List[str]] = None
    status: str = "active"

    model_config = ConfigDict(from_attributes=True)


class OfficeLocationMapResponse(BaseModel):
    """
    Approved company office location for the public Bengaluru map.
    Visually distinguishes offices with active vacancies from those without active vacancies.
    """
    office_id: int
    office_name: Optional[str] = None
    company_id: int
    company_name: str
    company_slug: str
    company_logo_url: Optional[str] = None
    industry: Optional[str] = None
    address: Optional[str] = None
    locality: Optional[str] = None
    city: str = "Bengaluru"
    state: str = "Karnataka"
    postal_code: Optional[str] = None
    latitude: float
    longitude: float
    is_headquarters: bool = False
    is_verified: bool = True
    has_active_vacancies: bool = False
    active_jobs_count: int = 0
    total_vacancies: int = 0
    jobs: List[MapJobBrief] = []

    model_config = ConfigDict(from_attributes=True)
