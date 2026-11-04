from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.schemas.company import CompanyResponse
from app.schemas.office import OfficeResponse
from app.schemas.job_source import JobSourceResponse


class JobBase(BaseModel):
    title: str
    slug: str
    description: str
    employment_type: str = "full-time"
    experience_level: Optional[str] = "mid"
    role_type: Optional[str] = "full-time"
    workplace_type: Optional[str] = "on-site"
    locality: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    currency: Optional[str] = "INR"
    salary_currency: Optional[str] = "INR"
    skills: Optional[List[str]] = None
    application_url: Optional[str] = None
    status: str = "active"
    is_active: bool = True
    posted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class JobCreate(JobBase):
    company_id: int
    office_id: Optional[int] = None


class JobResponse(JobBase):
    id: int
    company_id: int
    office_id: Optional[int] = None
    company: Optional[CompanyResponse] = None
    office: Optional[OfficeResponse] = None
    sources: List[JobSourceResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaginatedJobsResponse(BaseModel):
    items: List[JobResponse]
    total: int
    page: int
    limit: int
    total_pages: int
    has_next: bool
    has_prev: bool


class JobMapResponse(BaseModel):
    id: int
    title: str
    slug: str
    employment_type: str
    experience_level: Optional[str] = "mid"
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    currency: Optional[str] = "INR"
    skills: Optional[List[str]] = None
    status: str
    company_id: int
    office_id: int
    company_name: str
    locality: Optional[str] = None
    address: Optional[str] = None
    city: str = "Bengaluru"
    latitude: float
    longitude: float
    company: Optional[CompanyResponse] = None
    office: Optional[OfficeResponse] = None

    model_config = ConfigDict(from_attributes=True)
