from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class RawJobData(BaseModel):
    title: str
    description: str
    slug: Optional[str] = None
    employment_type: str = "full-time"
    experience_level: Optional[str] = "mid"
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    currency: Optional[str] = "INR"
    skills: List[str] = Field(default_factory=list)
    application_url: str
    status: str = "active"
    source_name: str
    source_url: str
    posted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    office_locality: Optional[str] = None

    model_config = ConfigDict(extra="ignore")


class RawOfficeData(BaseModel):
    address: Optional[str] = None
    locality: str
    city: str = "Bengaluru"
    state: str = "Karnataka"
    postal_code: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    model_config = ConfigDict(extra="ignore")


class RawCompanyData(BaseModel):
    name: str
    slug: Optional[str] = None
    description: Optional[str] = None
    website: str
    logo_url: Optional[str] = None
    industry: Optional[str] = None
    company_size: Optional[str] = None
    founded_year: Optional[int] = None
    is_verified: bool = True

    model_config = ConfigDict(extra="ignore")


class RawStartupRecord(BaseModel):
    company: RawCompanyData
    offices: List[RawOfficeData] = Field(default_factory=list)
    jobs: List[RawJobData] = Field(default_factory=list)

    model_config = ConfigDict(extra="ignore")


class ValidatedJob(BaseModel):
    title: str
    slug: str
    description: str
    employment_type: str = "full-time"
    experience_level: Optional[str] = "mid"
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    currency: Optional[str] = "INR"
    skills: List[str] = Field(default_factory=list)
    application_url: str
    status: str = "active"
    source_name: str
    source_url: str
    posted_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    office_locality: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ValidatedOffice(BaseModel):
    address: str
    locality: str
    city: str = "Bengaluru"
    state: str = "Karnataka"
    postal_code: str
    latitude: float
    longitude: float

    model_config = ConfigDict(from_attributes=True)


class ValidatedCompany(BaseModel):
    name: str
    slug: str
    description: str
    website: str
    logo_url: Optional[str] = None
    industry: str
    company_size: Optional[str] = None
    founded_year: Optional[int] = None
    is_verified: bool = True

    model_config = ConfigDict(from_attributes=True)


class ValidatedStartupRecord(BaseModel):
    company: ValidatedCompany
    offices: List[ValidatedOffice]
    jobs: List[ValidatedJob]

    model_config = ConfigDict(from_attributes=True)


class ValidationIssue(BaseModel):
    field: str
    message: str
    severity: str = "error"  # "error" or "warning"


class RejectedRecord(BaseModel):
    company_name: Optional[str] = None
    raw_record: Dict[str, Any]
    issues: List[ValidationIssue]


class ValidationBatch(BaseModel):
    accepted: List[ValidatedStartupRecord] = Field(default_factory=list)
    rejected: List[RejectedRecord] = Field(default_factory=list)
    total_processed: int = 0

    @property
    def is_valid(self) -> bool:
        return len(self.rejected) == 0


class ImportReport(BaseModel):
    total_records_processed: int = 0
    companies_created: int = 0
    companies_updated: int = 0
    companies_skipped: int = 0
    offices_created: int = 0
    offices_updated: int = 0
    offices_skipped: int = 0
    jobs_created: int = 0
    jobs_updated: int = 0
    jobs_skipped: int = 0
    sources_created: int = 0
    sources_updated: int = 0
    errors: List[str] = Field(default_factory=list)
    duration_ms: float = 0.0

    @property
    def has_errors(self) -> bool:
        return len(self.errors) > 0
