import logging
from typing import List, Optional
from fastapi import APIRouter, Query, Response

from app.schemas.preview import MCAPreviewCompany, MCAPreviewSummary
from app.services.preview_service import (
    load_mca_preview_records,
    get_preview_summary,
)

logger = logging.getLogger(__name__)

preview_router = APIRouter()


@preview_router.get(
    "/mca-companies",
    response_model=List[MCAPreviewCompany],
    summary="Preview MCA company records with geocoded coordinates",
    description=(
        "Temporary, read-only endpoint to preview processed MCA startup records "
        "and geocoded coordinates without modifying the PostgreSQL database. "
        "Supports batch selection (20 or 100) and filtering by locality, industry, and geocoding source."
    ),
)
def get_mca_preview_companies(
    response: Response,
    file_path: Optional[str] = Query(
        None,
        description="Optional relative path to CSV file within data directory (e.g. data/output/mca_bengaluru_100_records.csv)",
    ),
    batch: Optional[int] = Query(
        None,
        description="Batch selection shortcut: 20 or 100 (e.g. ?batch=100 loads 100-record test batch)",
    ),
    dataset: Optional[str] = Query(
        None,
        description="Dataset selection: '20' or '100'",
    ),
    locality: Optional[str] = Query(
        None,
        description="Filter by locality substring (e.g. 'Peenya', 'JP Nagar', 'HSR Layout')",
    ),
    industry: Optional[str] = Query(
        None,
        description="Filter by industry (e.g. 'SaaS / Tech Services', 'FinTech')",
    ),
    geocoding_source: Optional[str] = Query(
        None,
        description="Filter by geocoding source ('nominatim_osm', 'locality_centroid', 'pincode_centroid')",
    ),
    include_duplicates: bool = Query(
        False,
        description="Whether to include records detected as duplicates of the 20-record batch",
    ),
) -> List[MCAPreviewCompany]:
    """
    Returns valid coordinate records from the MCA processed CSV file.
    No database interaction or state mutation.
    """
    items, total, skipped = load_mca_preview_records(
        file_path=file_path,
        batch=batch,
        dataset=dataset,
        locality=locality,
        industry=industry,
        geocoding_source=geocoding_source,
        include_duplicates=include_duplicates,
    )

    address_level_count = sum(1 for item in items if item.geocoding_source == "nominatim_osm")
    locality_centroid_count = sum(1 for item in items if item.geocoding_source != "nominatim_osm")
    manual_verif_count = sum(1 for item in items if not item.is_verified)

    # Add useful response headers for frontend/client inspection
    response.headers["X-Total-Records"] = str(total)
    response.headers["X-Valid-Coordinates"] = str(len(items))
    response.headers["X-Skipped-Records"] = str(skipped)
    response.headers["X-Address-Level-Count"] = str(address_level_count)
    response.headers["X-Locality-Centroid-Count"] = str(locality_centroid_count)
    response.headers["X-Manual-Verification-Count"] = str(manual_verif_count)

    return items


@preview_router.get(
    "/mca-companies/summary",
    response_model=MCAPreviewSummary,
    summary="Get preview metadata and summary statistics",
    description="Returns aggregate counts, validation audit, and metadata alongside preview records.",
)
def get_mca_preview_summary(
    file_path: Optional[str] = Query(None, description="Optional relative path to CSV file"),
    batch: Optional[int] = Query(None, description="Batch selection: 20 or 100"),
    dataset: Optional[str] = Query(None, description="Dataset identifier: '20' or '100'"),
    locality: Optional[str] = Query(None, description="Optional locality filter"),
    industry: Optional[str] = Query(None, description="Optional industry filter"),
    geocoding_source: Optional[str] = Query(None, description="Optional geocoding source filter"),
) -> MCAPreviewSummary:
    """
    Returns structured summary with geocoding breakdown and items.
    """
    return get_preview_summary(
        file_path=file_path,
        batch=batch,
        dataset=dataset,
        locality=locality,
        industry=industry,
        geocoding_source=geocoding_source,
    )
