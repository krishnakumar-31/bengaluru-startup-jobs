import csv
import json
import logging
import math
from pathlib import Path
from typing import Any, List, Optional, Tuple
from fastapi import HTTPException, status

from app.schemas.preview import MCAPreviewCompany, MCAPreviewSummary

logger = logging.getLogger(__name__)

# Base directory for the repository root
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"
DEFAULT_20_PREVIEW_CSV = DATA_DIR / "output" / "mca_bengaluru_20_records.csv"
DEFAULT_100_PREVIEW_CSV = DATA_DIR / "output" / "mca_bengaluru_100_records.csv"
DEFAULT_500_PREVIEW_CSV = DATA_DIR / "output" / "mca_bengaluru_500_records.csv"

# Greater Bengaluru geographic bounding box for strict coordinate validity
BENGALURU_MIN_LAT = 12.70
BENGALURU_MAX_LAT = 13.25
BENGALURU_MIN_LNG = 77.35
BENGALURU_MAX_LNG = 77.85


def resolve_preview_file(
    file_name_or_path: Optional[str] = None,
    batch: Optional[int] = None,
    dataset: Optional[str] = None,
) -> Optional[Path]:
    """
    Safely resolves a preview CSV path within the workspace data directory.
    Guards against path traversal attacks. Supports selection by batch (20, 100, or 500)
    or explicit file path. Returns None if default/batch files are archived or unavailable.
    """
    # 1. Batch / Dataset shortcut resolution
    if batch == 500 or dataset == "500":
        target = DEFAULT_500_PREVIEW_CSV
    elif batch == 100 or dataset == "100":
        target = DEFAULT_100_PREVIEW_CSV
    elif batch == 20 or dataset == "20":
        target = DEFAULT_20_PREVIEW_CSV
    elif not file_name_or_path:
        # Default to 20 batch if neither is specified for backward compatibility,
        # fallback to 100, then 500
        if DEFAULT_20_PREVIEW_CSV.exists():
            target = DEFAULT_20_PREVIEW_CSV
        elif DEFAULT_100_PREVIEW_CSV.exists():
            target = DEFAULT_100_PREVIEW_CSV
        elif DEFAULT_500_PREVIEW_CSV.exists():
            target = DEFAULT_500_PREVIEW_CSV
        else:
            return None
    else:
        # 2. Explicit path resolution with strict security check
        clean_path = file_name_or_path.strip().lstrip("/\\")

        # Check if clean_path points to an existing file in output/ or data/
        allowed_base = DATA_DIR.resolve()

        # Potential candidates
        candidates = [
            (DATA_DIR / "output" / clean_path).resolve(),
            (DATA_DIR / clean_path).resolve(),
            (PROJECT_ROOT / clean_path).resolve(),
        ]

        target = None
        for cand in candidates:
            # Traversal check: candidate must be strictly within DATA_DIR
            if str(cand).startswith(str(allowed_base)):
                if cand.exists() and cand.is_file():
                    target = cand
                    break

        # If none matched an existing file, resolve against PROJECT_ROOT for security error
        if not target:
            candidate = (PROJECT_ROOT / clean_path).resolve()
            if not str(candidate).startswith(str(allowed_base)):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Security violation: Preview file path must reside within the 'data' directory."
                )
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Preview CSV file not found: {Path(clean_path).name}"
            )

    if target is None or not target.exists() or not target.is_file():
        if file_name_or_path:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Preview CSV file not found: {target.name if target else clean_path}"
            )
        return None

    return target


def parse_float_safely(val: Optional[str]) -> Optional[float]:
    """Parses a float string safely, handling None, empty, NaN, and invalid strings."""
    if val is None:
        return None
    val_str = str(val).strip()
    if not val_str:
        return None
    try:
        f = float(val_str)
        if math.isnan(f) or math.isinf(f):
            return None
        return f
    except (ValueError, TypeError):
        return None


def parse_int_safely(val: Optional[str]) -> Optional[int]:
    """Parses an integer string safely."""
    if val is None:
        return None
    val_str = str(val).strip()
    if not val_str:
        return None
    try:
        # Handles "2022.0" float strings if present
        return int(float(val_str))
    except (ValueError, TypeError):
        return None


def parse_bool_safely(val: Any) -> bool:
    """Parses a boolean string or value safely."""
    if val is None:
        return False
    if isinstance(val, bool):
        return val
    s = str(val).strip().lower()
    return s in ["true", "1", "yes", "verified"]


def is_valid_bengaluru_coordinate(lat: float, lng: float) -> bool:
    """Checks whether the coordinate falls within Greater Bengaluru boundary."""
    return (
        BENGALURU_MIN_LAT <= lat <= BENGALURU_MAX_LAT
        and BENGALURU_MIN_LNG <= lng <= BENGALURU_MAX_LNG
    )


def load_mca_preview_records(
    file_path: Optional[str] = None,
    batch: Optional[int] = None,
    dataset: Optional[str] = None,
    locality: Optional[str] = None,
    industry: Optional[str] = None,
    geocoding_source: Optional[str] = None,
    entity_classification: Optional[str] = None,
    include_duplicates: bool = False,
) -> Tuple[List[MCAPreviewCompany], int, int]:
    """
    Parses MCA company CSV records safely.
    Validates coordinates, filters by optional query parameters, and returns:
    (valid_companies, total_records_parsed, skipped_records_count)
    """
    csv_file = resolve_preview_file(file_name_or_path=file_path, batch=batch, dataset=dataset)

    items: List[MCAPreviewCompany] = []
    total_records = 0
    skipped_records = 0

    if csv_file is None or not csv_file.exists():
        logger.info("MCA preview CSV dataset is absent or archived; returning empty preview list.")
        return items, 0, 0

    with open(csv_file, mode="r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            total_records += 1

            # Normalize keys by lowercasing and stripping whitespace and underscores
            normalized = {
                k.strip().lower().replace(" ", "_"): (v.strip() if v is not None else "")
                for k, v in row.items()
                if k
            }

            cin = normalized.get("cin") or normalized.get("corporate_id") or ""
            name = (
                normalized.get("display_name")
                or normalized.get("company_name")
                or normalized.get("legal_name")
                or normalized.get("name")
                or ""
            )
            legal_name = normalized.get("legal_name") or name
            address = (
                normalized.get("address")
                or normalized.get("registered_address")
                or normalized.get("office_address")
                or ""
            )

            # Check duplicate status if column present
            is_dup = parse_bool_safely(normalized.get("is_duplicate"))
            if not include_duplicates and is_dup:
                continue

            # Safely parse latitude and longitude
            lat_raw = normalized.get("latitude") or normalized.get("lat")
            lng_raw = normalized.get("longitude") or normalized.get("lng") or normalized.get("lon")

            lat = parse_float_safely(lat_raw)
            lng = parse_float_safely(lng_raw)

            # Coordinate validation
            if lat is None or lng is None or not is_valid_bengaluru_coordinate(lat, lng):
                logger.warning(
                    f"Skipping MCA record with missing or out-of-bounds coordinates: "
                    f"CIN={cin}, Name='{name}', Lat={lat_raw}, Lng={lng_raw}"
                )
                skipped_records += 1
                continue

            geo_source = normalized.get("geocoding_source") or normalized.get("source") or "nominatim_osm"
            confidence = normalized.get("confidence") or "high"
            row_locality = normalized.get("locality") or ""
            row_industry = normalized.get("industry") or ""
            entity_class = (
                normalized.get("entity_classification")
                or normalized.get("classification")
                or "uncertain_for_review"
            )
            class_reason = normalized.get("classification_reason") or None

            # Apply optional filters
            if locality and locality.strip().lower() not in row_locality.lower():
                continue
            if industry and industry.strip().lower() not in row_industry.lower():
                continue
            if geocoding_source and geocoding_source.strip().lower() != geo_source.lower():
                continue
            if entity_classification and entity_classification.strip().lower() != entity_class.lower():
                continue

            # Candidates from MCA test batches default to False (unverified)
            is_verified = parse_bool_safely(normalized.get("is_verified"))
            verif_status = normalized.get("verification_status") or ("verified_startup" if is_verified else "unverified_candidate")
            cand_status = normalized.get("candidate_status") or "needs_manual_verification"
            dup_reason = normalized.get("duplicate_reason") or normalized.get("notes") or None

            company = MCAPreviewCompany(
                cin=cin,
                name=name,
                legal_name=legal_name,
                slug=normalized.get("slug") or "",
                industry=row_industry or None,
                mca_sector=normalized.get("mca_sector") or None,
                founded_year=parse_int_safely(normalized.get("founded_year")),
                registration_date=normalized.get("registration_date") or None,
                authorized_capital=parse_float_safely(normalized.get("authorized_capital")),
                paidup_capital=parse_float_safely(normalized.get("paidup_capital")),
                locality=row_locality or None,
                postal_code=normalized.get("postal_code") or normalized.get("pincode") or None,
                address=address,
                latitude=lat,
                longitude=lng,
                geocoding_source=geo_source,
                confidence=confidence,
                is_verified=is_verified,
                verification_status=verif_status,
                candidate_status=cand_status,
                is_duplicate=is_dup,
                duplicate_reason=dup_reason,
                entity_classification=entity_class,
                classification_reason=class_reason,
            )
            items.append(company)

    return items, total_records, skipped_records


def get_preview_summary(
    file_path: Optional[str] = None,
    batch: Optional[int] = None,
    dataset: Optional[str] = None,
    locality: Optional[str] = None,
    industry: Optional[str] = None,
    geocoding_source: Optional[str] = None,
    entity_classification: Optional[str] = None,
) -> MCAPreviewSummary:
    """Builds a structured preview summary including counts, validation audit, and items."""
    csv_file = resolve_preview_file(file_name_or_path=file_path, batch=batch, dataset=dataset)
    if csv_file is None or not csv_file.exists():
        return MCAPreviewSummary(
            file_name="None (Archived)",
            total_records=0,
            valid_coordinates_count=0,
            skipped_records_count=0,
            total_processed=0,
            valid_records_count=0,
            duplicate_records_count=0,
            failed_records_count=0,
            address_level_count=0,
            locality_centroid_count=0,
            manual_verification_count=0,
            startup_count=0,
            established_company_count=0,
            uncertain_for_review_count=0,
            items=[],
        )

    items, total, skipped = load_mca_preview_records(
        file_path=file_path,
        batch=batch,
        dataset=dataset,
        locality=locality,
        industry=industry,
        geocoding_source=geocoding_source,
        entity_classification=entity_classification,
    )

    address_level_count = sum(1 for item in items if item.geocoding_source == "nominatim_osm")
    locality_centroid_count = sum(1 for item in items if item.geocoding_source != "nominatim_osm")

    # Classification counts
    startup_count = sum(1 for item in items if item.entity_classification == "startup")
    established_company_count = sum(1 for item in items if item.entity_classification == "established_company")
    uncertain_for_review_count = sum(1 for item in items if item.entity_classification == "uncertain_for_review")

    # Check if a dedicated batch summary JSON is available on disk
    is_500_batch = "500" in csv_file.name or batch == 500 or dataset == "500"
    is_100_batch = "100" in csv_file.name or batch == 100 or dataset == "100"

    if is_500_batch:
        summary_file = DATA_DIR / "output" / "mca_500_processing_summary.json"
    elif is_100_batch:
        summary_file = DATA_DIR / "output" / "mca_100_processing_summary.json"
    else:
        summary_file = DATA_DIR / "output" / "mca_processing_summary.json"

    total_processed = total
    dup_count = 0
    failed_count = skipped
    manual_verif_count = len(items)

    if summary_file.exists():
        try:
            with open(summary_file, "r", encoding="utf-8") as sf:
                meta = json.load(sf)
                total_processed = meta.get("total_processed") or meta.get("total_evaluated_in_run", total)
                dup_count = meta.get("duplicate_records_count", 0)
                failed_count = meta.get("failed_records_count", skipped)
                manual_verif_count = meta.get("manual_verification_count", len(items))
        except Exception as e:
            logger.warning(f"Could not read summary JSON: {e}")

    return MCAPreviewSummary(
        file_name=csv_file.name,
        total_records=total,
        valid_coordinates_count=len(items),
        skipped_records_count=skipped,
        total_processed=total_processed,
        valid_records_count=len(items),
        duplicate_records_count=dup_count,
        failed_records_count=failed_count,
        address_level_count=address_level_count,
        locality_centroid_count=locality_centroid_count,
        manual_verification_count=manual_verif_count,
        startup_count=startup_count,
        established_company_count=established_company_count,
        uncertain_for_review_count=uncertain_for_review_count,
        database_modified=False,
        items=items,
    )
