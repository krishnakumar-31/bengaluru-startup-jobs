from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.schemas.office import OfficeResponse


class CompanyBase(BaseModel):
    name: str
    slug: str
    cin: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    website_url: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    logo_url: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    founded_year: Optional[int] = None
    is_verified: bool = False
    locality: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class CompanyCreate(CompanyBase):
    pass


class CompanyResponse(CompanyBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CompanyJobItem(BaseModel):
    id: int
    title: str
    slug: str
    employment_type: str = "full-time"
    work_mode: str = "in-office"
    vacancies: int = 1
    experience_level: Optional[str] = "mid"
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    currency: Optional[str] = "INR"
    skills: Optional[List[str]] = None
    status: str = "active"
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class CompanyDetailResponse(CompanyResponse):
    offices: List[OfficeResponse] = []
    jobs: List[CompanyJobItem] = []


class PaginatedCompaniesResponse(BaseModel):
    items: List[CompanyResponse]
    total: int
    page: int
    limit: int
    total_pages: int
    has_next: bool
    has_prev: bool
