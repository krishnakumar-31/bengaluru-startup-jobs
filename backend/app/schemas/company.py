from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class CompanyBase(BaseModel):
    name: str
    slug: str
    description: Optional[str] = None
    website: Optional[str] = None
    website_url: Optional[str] = None
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


class PaginatedCompaniesResponse(BaseModel):
    items: List[CompanyResponse]
    total: int
    page: int
    limit: int
    total_pages: int
    has_next: bool
    has_prev: bool
