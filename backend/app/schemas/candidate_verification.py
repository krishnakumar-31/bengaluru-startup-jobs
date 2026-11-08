from datetime import datetime, timezone
from typing import List, Optional, Literal
from pydantic import BaseModel, Field, HttpUrl, field_validator


VerificationStatusType = Literal["Needs Review", "Verified", "Rejected"]


class CandidateCompanyItem(BaseModel):
    """
    Representation of an MCA candidate company combined with its manual verification review state.
    Candidate records remain strictly isolated from production company/office tables.
    """
    cin: str = Field(..., description="Corporate Identification Number (Unique Key)")
    name: str = Field(..., description="Company display name")
    legal_name: str = Field(..., description="Full legal registered entity name")
    slug: str = Field(..., description="URL identifier")
    industry: Optional[str] = Field(None, description="Categorized industry")
    mca_sector: Optional[str] = Field(None, description="Original MCA Sector")
    founded_year: Optional[int] = Field(None, description="Year of incorporation")
    registration_date: Optional[str] = Field(None, description="Incorporation date (YYYY-MM-DD)")
    authorized_capital: Optional[float] = Field(None, description="Authorized capital in INR")
    paidup_capital: Optional[float] = Field(None, description="Paid-up capital in INR")
    company_status: str = Field("Active", description="MCA Company Status (e.g. Active)")
    entity_classification: str = Field(
        "uncertain_for_review",
        description="Classification: 'startup', 'established_company', 'uncertain_for_review'"
    )
    classification_reason: Optional[str] = Field(None, description="Reasoning for classification")

    # Registered Address (Official MCA Master Data)
    registered_address: str = Field(..., description="Official MCA registered office address")
    postal_code: Optional[str] = Field(None, description="Registered postal PIN code")
    locality: Optional[str] = Field(None, description="Registered office locality / corridor")
    latitude: float = Field(..., description="Registered office latitude")
    longitude: float = Field(..., description="Registered office longitude")
    geocoding_source: str = Field("nominatim_osm", description="Geocoding source precision")
    confidence: str = Field("high", description="Geocoding confidence")

    # Manual Verification Review & Evidence Fields (Requirements 5, 6, 8)
    verification_status: str = Field(
        "Needs Review",
        description="Current verification status: 'Needs Review', 'Verified', 'Rejected'"
    )
    is_verified: bool = Field(
        False,
        description="Whether this candidate has been reviewed and verified by an admin"
    )
    official_website: Optional[str] = Field(None, description="Confirmed official website URL")
    evidence_url: Optional[str] = Field(None, description="Evidence / proof URL (LinkedIn, Crunchbase, MCA doc)")
    actual_operating_office_address: Optional[str] = Field(
        None,
        description="Confirmed physical operating office premises (distinguished from registered address)"
    )
    operating_locality: Optional[str] = Field(None, description="Locality of operating office")
    operating_pincode: Optional[str] = Field(None, description="PIN code of operating office")
    operating_latitude: Optional[float] = Field(None, description="Operating office latitude")
    operating_longitude: Optional[float] = Field(None, description="Operating office longitude")
    reviewer_notes: Optional[str] = Field(None, description="Auditor review notes and rationale")
    verification_date: Optional[str] = Field(None, description="Timestamp of when review was updated")
    reviewed_by: Optional[str] = Field(None, description="Username of admin reviewer")
    promoted_to_db: bool = Field(False, description="Whether this verified company has been promoted into PostgreSQL")
    db_company_id: Optional[int] = Field(None, description="PostgreSQL company ID if promoted")


class CandidateVerificationUpdate(BaseModel):
    """
    Payload for updating a candidate company's verification review and evidence.
    """
    verification_status: VerificationStatusType = Field(
        ...,
        description="Updated verification status: 'Needs Review', 'Verified', or 'Rejected'"
    )
    official_website: Optional[str] = Field(None, description="Confirmed official company website")
    evidence_url: Optional[str] = Field(None, description="Verification evidence / source URL")
    actual_operating_office_address: Optional[str] = Field(
        None,
        description="Confirmed physical operating office address if verified"
    )
    operating_locality: Optional[str] = Field(None, description="Operating office locality")
    operating_pincode: Optional[str] = Field(None, description="Operating office PIN code")
    reviewer_notes: Optional[str] = Field(None, description="Reviewer assessment notes")

    @field_validator("verification_status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        valid_statuses = {"Needs Review", "Verified", "Rejected"}
        if v not in valid_statuses:
            raise ValueError(f"Status must be one of {valid_statuses}")
        return v


class CandidateVerificationSummary(BaseModel):
    """
    Summary metrics of all candidate verifications across the candidate dataset.
    """
    total_candidates: int
    needs_review_count: int
    verified_count: int
    rejected_count: int
    startup_count: int
    established_count: int
    uncertain_count: int
    operating_office_confirmed_count: int
    website_confirmed_count: int
    evidence_confirmed_count: int


class PaginatedCandidatesResponse(BaseModel):
    """
    Paginated candidate companies response with summary statistics.
    """
    items: List[CandidateCompanyItem]
    total: int
    page: int
    limit: int = 20
    total_pages: int
    has_next: bool
    has_prev: bool
    summary: CandidateVerificationSummary
