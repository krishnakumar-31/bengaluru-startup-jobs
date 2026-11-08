from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, ConfigDict
from app.schemas.company import CompanyResponse
from app.schemas.office import OfficeResponse
from app.schemas.job import JobResponse


# --- Auth Schemas ---
class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminLoginResponse(BaseModel):
    username: str
    csrf_token: str
    token_type: str = "bearer"
    message: str = "Login successful"


class AdminProfileResponse(BaseModel):
    id: int
    username: str
    is_active: bool
    last_login_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminPasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=6, description="New password must be at least 6 characters")


# --- Stats & Charts Schemas ---
class ChartItem(BaseModel):
    label: str
    count: int
    percentage: float


class AdminStatsOverview(BaseModel):
    total_companies: int
    verified_companies: int
    unverified_companies: int
    total_offices: int
    total_jobs: int
    active_jobs: int
    expired_jobs: int
    unverified_jobs: int
    recent_companies: List[CompanyResponse]
    recent_jobs: List[JobResponse]


class AdminChartsResponse(BaseModel):
    companies_by_industry: List[ChartItem]
    jobs_by_industry: List[ChartItem]
    jobs_by_locality: List[ChartItem]
    jobs_by_status: List[ChartItem]


# --- Admin Company CRUD Schemas ---
class AdminCompanyCreate(BaseModel):
    name: str
    slug: Optional[str] = None
    cin: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    logo_url: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    founded_year: Optional[int] = None
    is_verified: bool = True


class AdminCompanyUpdate(BaseModel):
    name: Optional[str] = None
    slug: Optional[str] = None
    cin: Optional[str] = None
    description: Optional[str] = None
    website: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    logo_url: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    founded_year: Optional[int] = None
    is_verified: Optional[bool] = None


# --- Admin Office CRUD Schemas ---
class AdminOfficeCreate(BaseModel):
    company_id: int
    name: Optional[str] = None
    address: Optional[str] = None
    locality: str
    city: str = "Bengaluru"
    state: str = "Karnataka"
    postal_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_headquarters: bool = False


class AdminOfficeUpdate(BaseModel):
    company_id: Optional[int] = None
    name: Optional[str] = None
    address: Optional[str] = None
    locality: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    is_headquarters: Optional[bool] = None


# --- Admin Job CRUD Schemas ---
class AdminJobCreate(BaseModel):
    company_id: int
    office_id: Optional[int] = None
    title: str
    slug: Optional[str] = None
    description: str
    employment_type: str = "full-time"
    work_mode: str = "in-office"
    vacancies: int = 1
    experience_level: Optional[str] = "mid"
    experience_min: Optional[int] = None
    experience_max: Optional[int] = None
    role_type: Optional[str] = "full-time"
    workplace_type: Optional[str] = "on-site"
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    currency: Optional[str] = "INR"
    skills: Optional[List[str]] = None
    application_url: Optional[str] = None
    source_url: Optional[str] = None
    job_source_url: Optional[str] = None
    status: str = "active"
    posted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class AdminJobUpdate(BaseModel):
    company_id: Optional[int] = None
    office_id: Optional[int] = None
    title: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    employment_type: Optional[str] = None
    work_mode: Optional[str] = None
    vacancies: Optional[int] = None
    experience_level: Optional[str] = None
    experience_min: Optional[int] = None
    experience_max: Optional[int] = None
    role_type: Optional[str] = None
    workplace_type: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    currency: Optional[str] = None
    skills: Optional[List[str]] = None
    application_url: Optional[str] = None
    source_url: Optional[str] = None
    job_source_url: Optional[str] = None
    status: Optional[str] = None
    posted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None


class AdminJobStatusUpdate(BaseModel):
    status: str = Field(pattern="^(active|expired|closed)$")


# --- Import & Verification Schemas ---
class ImportPreviewItem(BaseModel):
    row_number: int = 1
    company_name: str
    company_slug: str
    company_cin: Optional[str] = None
    office_name: Optional[str] = None
    locality: Optional[str] = None
    job_title: Optional[str] = None
    job_slug: Optional[str] = None
    vacancies: Optional[int] = None
    is_duplicate_company: bool = False
    is_duplicate_office: bool = False
    is_duplicate_job: bool = False
    valid: bool
    issues: List[str] = []
    warnings: List[str] = []


class ImportPreviewResponse(BaseModel):
    total_records: int
    accepted_count: int
    rejected_count: int
    new_companies_count: int = 0
    existing_companies_count: int = 0
    new_offices_count: int = 0
    new_jobs_count: int = 0
    items: List[ImportPreviewItem]
    raw_accepted_json: Optional[str] = None


class ImportConfirmResponse(BaseModel):
    companies_created: int
    companies_updated: int
    offices_created: int
    offices_updated: int
    jobs_created: int
    jobs_updated: int
    skipped_count: int = 0
    rejected_count: int = 0
    message: str


class AdminVerificationResponse(BaseModel):
    unverified_companies: List[CompanyResponse]
    unverified_jobs: List[JobResponse]
    expired_jobs: List[JobResponse]
