from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class MCAPreviewCompany(BaseModel):
    """
    Schema for previewing MCA company records with geocoded coordinates.
    Read-only in-memory model; not stored in PostgreSQL.
    """
    cin: str = Field(..., description="Corporate Identification Number (CIN)")
    name: str = Field(..., description="Company display name")
    legal_name: Optional[str] = Field(None, description="Registered legal entity name")
    slug: Optional[str] = Field(None, description="URL-friendly identifier")
    industry: Optional[str] = Field(None, description="Categorized startup industry")
    mca_sector: Optional[str] = Field(None, description="Original MCA Sector")
    founded_year: Optional[int] = Field(None, description="Year of incorporation")
    registration_date: Optional[str] = Field(None, description="Date of registration")
    authorized_capital: Optional[float] = Field(None, description="Authorized capital in INR")
    paidup_capital: Optional[float] = Field(None, description="Paid-up capital in INR")
    locality: Optional[str] = Field(None, description="Identified Bengaluru locality or corridor")
    postal_code: Optional[str] = Field(None, description="Postal pincode")
    address: str = Field(..., description="Registered office address")
    latitude: float = Field(..., description="Geocoded latitude coordinate")
    longitude: float = Field(..., description="Geocoded longitude coordinate")
    geocoding_source: str = Field(
        "nominatim_osm",
        description="Geocoding source: 'nominatim_osm' (address-level), 'locality_centroid', 'pincode_centroid'"
    )
    confidence: str = Field(
        "high",
        description="Confidence level: 'high', 'medium', 'low'"
    )
    is_verified: bool = Field(
        False,
        description="Verification flag. Candidates from MCA batches default to False until manual review."
    )
    verification_status: Optional[str] = Field(
        "unverified_candidate",
        description="Status: 'unverified_candidate', 'verified_startup', 'duplicate', 'failed'"
    )
    candidate_status: Optional[str] = Field(
        "needs_manual_verification",
        description="Pipeline candidate state: 'needs_manual_verification', 'rejected', 'approved'"
    )
    is_duplicate: bool = Field(
        False,
        description="Whether this entity is a duplicate of a previously ingested record"
    )
    duplicate_reason: Optional[str] = Field(
        None,
        description="Details explaining why record was flagged as duplicate"
    )
    entity_classification: Optional[str] = Field(
        "uncertain_for_review",
        description="Classification: 'startup', 'established_company', 'uncertain_for_review'"
    )
    classification_reason: Optional[str] = Field(
        None,
        description="Rule explanation for startup vs established vs uncertain classification"
    )


class MCAPreviewSummary(BaseModel):
    """
    Summary metadata for CSV preview datasets.
    """
    file_name: str
    total_records: int
    valid_coordinates_count: int
    skipped_records_count: int
    total_processed: int = 0
    valid_records_count: int = 0
    duplicate_records_count: int = 0
    failed_records_count: int = 0
    address_level_count: int = 0
    locality_centroid_count: int = 0
    manual_verification_count: int = 0
    startup_count: int = 0
    established_company_count: int = 0
    uncertain_for_review_count: int = 0
    database_modified: bool = False
    items: List[MCAPreviewCompany]
