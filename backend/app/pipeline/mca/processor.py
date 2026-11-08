import csv
import logging
import re
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Generator, List, Optional, Set, Tuple

from app.pipeline.config import (
    BENGALURU_PINCODE_PATTERN,
    KNOWN_BENGALURU_LOCALITIES,
)
from app.pipeline.mca.geocoder import BENGALURU_PINCODE_CENTROIDS, BengaluruGeocoder

logger = logging.getLogger(__name__)

# Legal entity suffixes to strip when creating clean display names
LEGAL_SUFFIXES = [
    r"\bPRIVATE\s+LIMITED\b",
    r"\bPVT\s*\.?\s*LTD(\.|\b)?",
    r"\bLIMITED\b",
    r"\bLTD(\.|\b)?",
    r"\bLLP(\.|\b)?",
    r"\bINC(\.|\b)?",
    r"\bCORP(\.|\b)?",
]

# Industry Classification Taxonomy Mapping
INDUSTRY_CLASSIFICATION_MAP: Dict[str, str] = {
    "business services": "SaaS / Tech Services",
    "finance": "FinTech",
    "manufacturing (machinery and equipments)": "Hardware & Manufacturing",
    "community, personal and social services": "EdTech & Consumer Services",
    "transport, storage and communications": "Logistics & Mobility",
    "trading": "E-Commerce & Retail",
    "construction": "Real Estate & Infrastructure",
    "agriculture and allied activities": "AgriTech",
    "real estate and renting": "PropTech",
    "health and social work": "HealthTech",
}


def clean_company_name(raw_name: str) -> Tuple[str, str]:
    """Clean company legal name into a readable display name and URL slug.

    Returns:
        (display_name, slug)
    """
    clean = re.sub(r"\s+", " ", raw_name).strip()
    display = clean

    # Strip legal entity suffixes
    for pattern in LEGAL_SUFFIXES:
        display = re.sub(pattern, "", display, flags=re.IGNORECASE).strip()

    # Clean any trailing punctuation (dots, commas, hyphens)
    display = re.sub(r"[.,\-–—\s]+$", "", display).strip()

    # Format into Title Case
    display = " ".join(w.capitalize() for w in display.split())

    # Fallback to original if stripping emptied the string
    if not display:
        display = clean.title()

    # Create slug
    slug = re.sub(r"[^\w\s-]", "", display.lower())
    slug = re.sub(r"[\s_-]+", "-", slug).strip("-")

    return display, slug


def clean_pincode(raw_pin: Any) -> Optional[str]:
    """Extract standard 6-digit PIN code string from raw CSV value (e.g. 560058.0 -> 560058)."""
    if raw_pin is None:
        return None
    pin_str = str(raw_pin).strip().replace(".0", "")
    digits = re.sub(r"[^\d]", "", pin_str)
    if len(digits) == 6 and digits.startswith("560"):
        return digits
    return None


def extract_locality_from_address(address: str, pincode: Optional[str] = None) -> str:
    """Extract recognized Bengaluru locality or tech hub from address text or PIN code."""
    if not address:
        if pincode and pincode in BENGALURU_PINCODE_CENTROIDS:
            return BENGALURU_PINCODE_CENTROIDS[pincode][2].split("/")[0].strip()
        return "Bengaluru"

    norm_addr = address.lower()

    # Priority lookup for known tech hubs and localities
    for known_loc in sorted(KNOWN_BENGALURU_LOCALITIES, key=len, reverse=True):
        pattern = r"\b" + re.escape(known_loc) + r"\b"
        if re.search(pattern, norm_addr):
            return " ".join(w.capitalize() for w in known_loc.split())

    # Secondary check with word boundaries for major hubs
    common_aliases = {
        "hsr": "HSR Layout",
        "hbr": "HBR Layout",
        "jp nagar": "JP Nagar",
        "j.p. nagar": "JP Nagar",
        "peenya": "Peenya",
        "yeshwanthpur": "Yeshwanthpur",
        "vijayanagar": "Vijayanagar",
        "malleshwaram": "Malleshwaram",
        "koramangala": "Koramangala",
        "indiranagar": "Indiranagar",
        "whitefield": "Whitefield",
        "electronic city": "Electronic City",
        "bellandur": "Bellandur",
        "marathahalli": "Marathahalli",
        "kalyan nagar": "Kalyan Nagar",
        "yelahanka": "Yelahanka",
        "kengeri": "Kengeri",
        "rajajinagar": "Rajajinagar",
        "mg road": "MG Road",
        "lavelle road": "Lavelle Road",
        "bannerghatta road": "Bannerghatta Road",
        "bannergatta road": "Bannerghatta Road",
        "bg road": "Bannerghatta Road",
        "b g road": "Bannerghatta Road",
        "cv raman nagar": "CV Raman Nagar",
        "mahadevapura": "Mahadevapura",
        "nandini layout": "Nandini Layout",
        "mahalakshmipuram": "Mahalakshmipuram",
        "aecs layout": "AECS Layout",
        "kundanahalli": "Kundalahalli",
        "kundalahalli": "Kundalahalli",
    }
    for alias, formal_name in common_aliases.items():
        if alias in norm_addr:
            return formal_name

    # Fallback to PIN code database if available
    if pincode and pincode in BENGALURU_PINCODE_CENTROIDS:
        return BENGALURU_PINCODE_CENTROIDS[pincode][2].split("/")[0].strip()

    return "Bengaluru"


def clean_address(raw_address: str) -> str:
    """Format and clean address string."""
    addr = re.sub(r"\s+", " ", raw_address or "").strip()
    addr = re.sub(r",\s*,+", ", ", addr)
    addr = addr.rstrip(",- ")
    return addr


def map_industry(classification: Optional[str]) -> str:
    """Map MCA industrial classification to modern tech industry category."""
    if not classification:
        return "Technology / Services"
    norm = classification.strip().lower()
    return INDUSTRY_CLASSIFICATION_MAP.get(norm, classification.title())


# Keyword lexicons for entity classification (Requirement 6 & 7: Do not classify all MCA companies as startups)
TECH_KEYWORDS = {
    "tech", "technology", "technologies", "software", "systems", "solutions", "digital",
    "labs", "lab", "analytics", "data", "ai", "artificial intelligence", "cloud", "cyber",
    "fintech", "edtech", "healthtech", "biotech", "robotics", "automation", "networks",
    "platform", "platforms", "saas", "iot", "mobility", "app", "apps", "informatics",
    "telecom", "semiconductor", "comput", "infotech", "interactive", "media tech", "ventures",
    "hydrosystems", "energy tech", "nanotech", "web", "devops", "intelligence"
}

TRADITIONAL_KEYWORDS = {
    "construction", "builders", "infra", "infrastructure", "developers", "estates",
    "brick", "cement", "concrete", "granite", "marble", "quarry", "stone",
    "trading", "traders", "trade", "imports", "exports", "enterprises", "distributors",
    "steel", "metals", "iron", "minerals", "pipes", "alloys", "foundry",
    "textiles", "garments", "fabrics", "apparel", "silk", "cotton", "weaving",
    "saw mill", "timber", "plywood", "wood", "furniture",
    "transport", "trucking", "logistics", "carriers", "cabs", "travels", "freight",
    "hotel", "hospitality", "resort", "restaurant", "caterers", "food court",
    "farming", "poultry", "plantation", "dairy", "agro", "feed",
    "printing", "press", "packaging", "corrugat",
    "automobile", "motors", "garage", "spares",
    "fertilizers", "pesticides", "mills", "jewellers", "jewellery", "gold", "bullion",
    "chemicals"
}


def classify_company_entity(
    name: str,
    legal_name: str,
    mca_sector: Optional[str] = None,
    founded_year: Optional[int] = None,
) -> Tuple[str, str]:
    """
    Classifies an MCA company candidate into one of three distinct categories:
    1. 'startup': Technology-driven, digital platform, software, SaaS, or high-tech product entity.
    2. 'established_company': Traditional brick-and-mortar, civil construction, heavy trade, manufacturing, or conventional transport.
    3. 'uncertain_for_review': Generic business services or ambiguous indicators requiring human administrative review.
    
    Returns:
        (classification, reason)
    """
    text = f"{name} {legal_name}".lower()
    sector = (mca_sector or "").lower()

    has_trad_kw = any(kw in text for kw in TRADITIONAL_KEYWORDS)
    has_tech_kw = any(kw in text for kw in TECH_KEYWORDS)

    # 1. Traditional strong indicators
    if has_trad_kw and not has_tech_kw:
        return "established_company", "Contains traditional trade/infrastructure keywords and no tech indicators"

    if any(s in sector for s in ["construction", "agriculture", "mining", "metals", "textiles", "transport"]):
        if not has_tech_kw:
            return "established_company", f"Traditional industry sector ({mca_sector or 'conventional'}) without tech indicators"

    # 2. Tech / Startup indicators
    if has_tech_kw and not has_trad_kw:
        if founded_year and founded_year >= 2010:
            return "startup", f"Modern technology keywords in {mca_sector or 'tech'} founded in {founded_year}"
        return "startup", f"Technology markers present in entity name and sector ({mca_sector or 'Tech'})"

    # 3. Generic business services / consulting without strong markers
    if "business services" in sector or "finance" in sector:
        if has_tech_kw:
            return "startup", "Tech business service entity"
        return "uncertain_for_review", "Generic business service / consulting entity requiring manual review"

    # 4. Ambiguous / Mixed fallback
    return "uncertain_for_review", "Mixed or ambiguous industry/entity markers requiring manual review"


class MCAPipelineProcessor:
    """End-to-end pipeline for filtering, validating, and geocoding MCA Company Master Data."""

    def __init__(self, geocoder: Optional[BengaluruGeocoder] = None):
        self.geocoder = geocoder or BengaluruGeocoder(use_online=True)

    def filter_and_process(
        self,
        csv_file_path: Path,
        limit: Optional[int] = 20,
    ) -> List[Dict[str, Any]]:
        """Process input MCA CSV file, filter for active Bengaluru entities,
        validate fields, geocode offices, and return structured output records.
        Preserved for backwards compatibility with existing test suites.
        """
        processed_records: List[Dict[str, Any]] = []
        seen_cins = set()
        seen_names = set()

        with open(csv_file_path, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)

            for row_idx, row in enumerate(reader):
                if limit and len(processed_records) >= limit:
                    break

                # 1. Filter: Status must be Active
                status = (row.get("Company Status") or "").strip().lower()
                if status != "active":
                    continue

                # 2. Filter: Postal code must be valid Bengaluru (560xxx)
                pincode = clean_pincode(row.get("Pin Code"))
                if not pincode:
                    continue

                # 3. Filter: ROC / State / Address confirmation
                roc = (row.get("Company ROC") or "").strip().lower()
                state = (row.get("Company State") or "").strip().lower()
                addr = (row.get("Company Address") or "").strip()

                if "bangalore" not in roc and "karnataka" not in state and "bangalore" not in addr.lower() and "bengaluru" not in addr.lower():
                    continue

                cin = (row.get("CIN") or "").strip()
                legal_name = (row.get("Company Name") or "").strip()

                if not cin or not legal_name:
                    continue

                # Deduplication check
                if cin in seen_cins or legal_name in seen_names:
                    continue

                # 4. Extract and clean metadata
                display_name, slug = clean_company_name(legal_name)
                locality = extract_locality_from_address(addr, pincode)
                cleaned_addr = clean_address(addr)

                # Parse registration date and founded year
                reg_date_str = (row.get("Company Registration Date") or "").strip()
                founded_year = None
                if reg_date_str:
                    try:
                        dt = datetime.strptime(reg_date_str, "%Y-%m-%d")
                        founded_year = dt.year
                    except ValueError:
                        pass

                # Parse financials
                try:
                    auth_cap = float(row.get("Authorized Capital", 0) or 0)
                except ValueError:
                    auth_cap = 0.0

                try:
                    paid_cap = float(row.get("Paidup Capital", 0) or 0)
                except ValueError:
                    paid_cap = 0.0

                industry = map_industry(row.get("Company Industrial Classification"))

                # 5. Geocoding
                lat, lng, geo_source, confidence = self.geocoder.geocode(
                    locality=locality,
                    postal_code=pincode,
                    address=cleaned_addr,
                )

                # Verify bounding box
                is_valid_coords = self.geocoder.is_within_bounds(lat, lng)
                if not is_valid_coords:
                    logger.warning(f"Coordinates ({lat}, {lng}) outside Bengaluru bounds for {legal_name}")
                    continue

                seen_cins.add(cin)
                seen_names.add(legal_name)

                record = {
                    "company": {
                        "name": display_name,
                        "legal_name": legal_name,
                        "cin": cin,
                        "slug": slug,
                        "industry": industry,
                        "mca_classification": row.get("Company Industrial Classification", ""),
                        "company_category": row.get("Company Category", ""),
                        "company_class": row.get("Company Class", "Private"),
                        "listing_status": row.get("Listing Status", "Unlisted"),
                        "founded_year": founded_year,
                        "registration_date": reg_date_str or None,
                        "authorized_capital": auth_cap,
                        "paidup_capital": paid_cap,
                        "is_verified": True,
                        "verification_source": "MCA Company Master Data",
                    },
                    "office": {
                        "address": cleaned_addr,
                        "locality": locality,
                        "city": "Bengaluru",
                        "state": "Karnataka",
                        "postal_code": pincode,
                        "latitude": round(lat, 4),
                        "longitude": round(lng, 4),
                        "geocoding_source": geo_source,
                        "geocoding_confidence": confidence,
                    },
                }

                processed_records.append(record)

        return processed_records

    def process_batch(
        self,
        csv_file_path: Path,
        batch_size: int = 100,
        reference_file: Optional[Path] = None,
        mark_as_candidates: bool = True,
    ) -> Dict[str, Any]:
        """
        Processes a strict batch of records from the raw MCA dataset.
        
        Performs:
        1. Batch evaluation for up to `batch_size` records (e.g. 100 records).
        2. Duplicate detection against existing reference records (e.g. original 20-record batch).
        3. Strict validation rule enforcement (status active, Bengaluru postal code 560xxx, location).
        4. Geocoding resolution preserving source and confidence score.
        5. Separation of address-level geocoding from locality-centroid approximations.
        6. Detailed auditing of failed records with exact reasons.
        7. Separation of unverified company candidates from verified startups (is_verified: False).
        """
        # Load reference records for duplicate detection if reference file exists
        reference_cins: Set[str] = set()
        reference_names: Set[str] = set()

        if reference_file and reference_file.exists():
            with open(reference_file, "r", encoding="utf-8", errors="replace") as rf:
                ref_reader = csv.DictReader(rf)
                for r in ref_reader:
                    cin_val = (r.get("CIN") or r.get("cin") or "").strip()
                    if cin_val:
                        reference_cins.add(cin_val)
                    legal_val = (r.get("Legal Name") or r.get("legal_name") or r.get("Display Name") or "").strip().lower()
                    if legal_val:
                        reference_names.add(legal_val)

        valid_records: List[Dict[str, Any]] = []
        duplicate_records: List[Dict[str, Any]] = []
        failed_records: List[Dict[str, Any]] = []
        all_evaluated_rows: List[Dict[str, Any]] = []

        seen_batch_cins: Set[str] = set()
        seen_batch_names: Set[str] = set()

        address_level_count = 0
        locality_centroid_count = 0
        failure_reasons_counter: Dict[str, int] = {}
        localities_counter: Dict[str, int] = {}
        industries_counter: Dict[str, int] = {}

        total_processed = 0

        with open(csv_file_path, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)

            for row_idx, row in enumerate(reader):
                if total_processed >= batch_size:
                    break

                total_processed += 1

                cin = (row.get("CIN") or "").strip()
                legal_name = (row.get("Company Name") or "").strip()
                status = (row.get("Company Status") or "").strip().lower()
                pin_raw = row.get("Pin Code")
                pincode = clean_pincode(pin_raw)
                roc = (row.get("Company ROC") or "").strip().lower()
                state = (row.get("Company State") or "").strip().lower()
                addr = clean_address(row.get("Company Address") or "")

                display_name, slug = clean_company_name(legal_name) if legal_name else ("", "")
                locality = extract_locality_from_address(addr, pincode) if addr else "Bengaluru"
                industry = map_industry(row.get("Company Industrial Classification"))

                audit_entry: Dict[str, Any] = {
                    "row_index": row_idx,
                    "cin": cin,
                    "company_name": legal_name,
                    "display_name": display_name,
                    "raw_pin": pin_raw,
                    "postal_code": pincode,
                    "status": status,
                    "locality": locality,
                    "address": addr,
                }

                # --- 1. Duplicate Detection against Existing Reference (e.g. 20-record batch) ---
                is_duplicate = False
                duplicate_reason = ""

                if cin and cin in reference_cins:
                    is_duplicate = True
                    duplicate_reason = f"Duplicate CIN '{cin}' matches existing 20-record dataset"
                elif legal_name and legal_name.lower() in reference_names:
                    is_duplicate = True
                    duplicate_reason = f"Duplicate entity name '{legal_name}' matches existing 20-record dataset"
                elif cin and cin in seen_batch_cins:
                    is_duplicate = True
                    duplicate_reason = f"Duplicate CIN '{cin}' repeated within current batch"
                elif legal_name and legal_name.lower() in seen_batch_names:
                    is_duplicate = True
                    duplicate_reason = f"Duplicate entity name '{legal_name}' repeated within current batch"

                if is_duplicate:
                    # Still attempt geocoding so coordinates are preserved for full batch export
                    lat, lng, geo_source, confidence = self.geocoder.geocode(locality, pincode, addr)
                    dup_record = {
                        "row_index": row_idx,
                        "cin": cin,
                        "legal_name": legal_name,
                        "display_name": display_name,
                        "slug": slug,
                        "industry": industry,
                        "locality": locality,
                        "postal_code": pincode or "",
                        "address": addr,
                        "latitude": round(lat, 4) if lat else None,
                        "longitude": round(lng, 4) if lng else None,
                        "geocoding_source": geo_source,
                        "confidence": confidence,
                        "duplicate_reason": duplicate_reason,
                        "duplicate_of": "mca_bengaluru_20_records.csv",
                    }
                    duplicate_records.append(dup_record)
                    audit_entry["outcome"] = "DUPLICATE"
                    audit_entry["details"] = duplicate_reason
                    audit_entry["latitude"] = round(lat, 4) if lat else None
                    audit_entry["longitude"] = round(lng, 4) if lng else None
                    audit_entry["geocoding_source"] = geo_source
                    audit_entry["confidence"] = confidence
                    all_evaluated_rows.append(audit_entry)
                    continue

                seen_batch_cins.add(cin)
                seen_batch_names.add(legal_name.lower())

                # --- 2. Validation Rule: Required Fields ---
                if not cin or not legal_name:
                    reason = "Missing essential identifier: CIN or Company Name is empty"
                    failure_reasons_counter[reason] = failure_reasons_counter.get(reason, 0) + 1
                    failed_record = {
                        "row_index": row_idx,
                        "cin": cin,
                        "company_name": legal_name,
                        "failure_stage": "REQUIRED_FIELDS",
                        "failure_reason": reason,
                    }
                    failed_records.append(failed_record)
                    audit_entry["outcome"] = "FAILED"
                    audit_entry["details"] = reason
                    all_evaluated_rows.append(audit_entry)
                    continue

                # --- 3. Validation Rule: Active Status ---
                if status != "active":
                    reason = f"Inactive company status: '{status or 'Unknown'}'"
                    failure_reasons_counter[reason] = failure_reasons_counter.get(reason, 0) + 1
                    failed_record = {
                        "row_index": row_idx,
                        "cin": cin,
                        "company_name": legal_name,
                        "status": status,
                        "failure_stage": "COMPANY_STATUS",
                        "failure_reason": reason,
                    }
                    failed_records.append(failed_record)
                    audit_entry["outcome"] = "FAILED"
                    audit_entry["details"] = reason
                    all_evaluated_rows.append(audit_entry)
                    continue

                # --- 4. Validation Rule: Postal Code within Bengaluru Urban (560xxx) ---
                if not pincode:
                    reason = f"Invalid or non-Bengaluru postal code: '{pin_raw}' (requires 560xxx)"
                    failure_reasons_counter[reason] = failure_reasons_counter.get(reason, 0) + 1
                    failed_record = {
                        "row_index": row_idx,
                        "cin": cin,
                        "company_name": legal_name,
                        "raw_pin": pin_raw,
                        "failure_stage": "PINCODE_VALIDATION",
                        "failure_reason": reason,
                    }
                    failed_records.append(failed_record)
                    audit_entry["outcome"] = "FAILED"
                    audit_entry["details"] = reason
                    all_evaluated_rows.append(audit_entry)
                    continue

                # --- 5. Validation Rule: Geographic Confirmation (ROC/State/Address) ---
                is_blr_evidence = (
                    "bangalore" in roc
                    or "karnataka" in state
                    or "bangalore" in addr.lower()
                    or "bengaluru" in addr.lower()
                )
                if not is_blr_evidence:
                    reason = "Registered address and ROC do not confirm Greater Bengaluru location"
                    failure_reasons_counter[reason] = failure_reasons_counter.get(reason, 0) + 1
                    failed_record = {
                        "row_index": row_idx,
                        "cin": cin,
                        "company_name": legal_name,
                        "roc": roc,
                        "state": state,
                        "address": addr,
                        "failure_stage": "LOCATION_EVIDENCE",
                        "failure_reason": reason,
                    }
                    failed_records.append(failed_record)
                    audit_entry["outcome"] = "FAILED"
                    audit_entry["details"] = reason
                    all_evaluated_rows.append(audit_entry)
                    continue

                # --- 6. Geocoding Resolution ---
                lat, lng, geo_source, confidence = self.geocoder.geocode(
                    locality=locality,
                    postal_code=pincode,
                    address=addr,
                )

                # --- 7. Validation Rule: Bounding Box Verification ---
                if not self.geocoder.is_within_bounds(lat, lng):
                    reason = f"Resolved coordinates ({lat}, {lng}) fall outside Greater Bengaluru bounding box"
                    failure_reasons_counter[reason] = failure_reasons_counter.get(reason, 0) + 1
                    failed_record = {
                        "row_index": row_idx,
                        "cin": cin,
                        "company_name": legal_name,
                        "latitude": lat,
                        "longitude": lng,
                        "failure_stage": "GEOCODING_BOUNDS",
                        "failure_reason": reason,
                    }
                    failed_records.append(failed_record)
                    audit_entry["outcome"] = "FAILED"
                    audit_entry["details"] = reason
                    all_evaluated_rows.append(audit_entry)
                    continue

                # Parse financials and founded year
                reg_date_str = (row.get("Company Registration Date") or "").strip()
                founded_year = None
                if reg_date_str:
                    try:
                        dt = datetime.strptime(reg_date_str, "%Y-%m-%d")
                        founded_year = dt.year
                    except ValueError:
                        pass

                try:
                    auth_cap = float(row.get("Authorized Capital", 0) or 0)
                except ValueError:
                    auth_cap = 0.0

                try:
                    paid_cap = float(row.get("Paidup Capital", 0) or 0)
                except ValueError:
                    paid_cap = 0.0

                # Track geocoding source separation
                if geo_source == "nominatim_osm":
                    address_level_count += 1
                else:
                    locality_centroid_count += 1

                localities_counter[locality] = localities_counter.get(locality, 0) + 1
                industries_counter[industry] = industries_counter.get(industry, 0) + 1

                # Classify company entity into startup, established_company, or uncertain_for_review
                mca_sector = row.get("Company Industrial Classification", "")
                entity_class, class_reason = classify_company_entity(
                    name=display_name,
                    legal_name=legal_name,
                    mca_sector=mca_sector,
                    founded_year=founded_year,
                )

                # Structured candidate record (separate from verified startups: is_verified = False)
                candidate_record = {
                    "company": {
                        "name": display_name,
                        "legal_name": legal_name,
                        "cin": cin,
                        "slug": slug,
                        "industry": industry,
                        "mca_classification": mca_sector,
                        "company_category": row.get("Company Category", ""),
                        "company_class": row.get("Company Class", "Private"),
                        "listing_status": row.get("Listing Status", "Unlisted"),
                        "founded_year": founded_year,
                        "registration_date": reg_date_str or None,
                        "authorized_capital": auth_cap,
                        "paidup_capital": paid_cap,
                        "entity_classification": entity_class,
                        "classification_reason": class_reason,
                        "is_verified": False if mark_as_candidates else True,
                        "verification_status": "unverified_candidate" if mark_as_candidates else "verified_startup",
                        "candidate_status": "needs_manual_verification",
                        "candidate_notes": "MCA Master Data candidate; pending manual verification by admin before publishing.",
                        "verification_source": "MCA Company Master Data (100-batch test)",
                    },
                    "office": {
                        "address": addr,
                        "locality": locality,
                        "city": "Bengaluru",
                        "state": "Karnataka",
                        "postal_code": pincode,
                        "latitude": round(lat, 4),
                        "longitude": round(lng, 4),
                        "geocoding_source": geo_source,
                        "geocoding_confidence": confidence,
                    },
                }

                valid_records.append(candidate_record)

                audit_entry["outcome"] = "VALID_CANDIDATE"
                audit_entry["details"] = "Passed all validation rules"
                audit_entry["latitude"] = round(lat, 4)
                audit_entry["longitude"] = round(lng, 4)
                audit_entry["geocoding_source"] = geo_source
                audit_entry["confidence"] = confidence
                all_evaluated_rows.append(audit_entry)

        # Candidates requiring manual verification: all valid candidates
        manual_verification_count = len(valid_records)

        summary_stats = {
            "total_processed": total_processed,
            "valid_records_count": len(valid_records),
            "duplicate_records_count": len(duplicate_records),
            "failed_records_count": len(failed_records),
            "address_level_count": address_level_count,
            "locality_centroid_count": locality_centroid_count,
            "manual_verification_count": manual_verification_count,
            "database_modified": False,
            "failure_reasons_breakdown": failure_reasons_counter,
            "locality_distribution": localities_counter,
            "industry_distribution": industries_counter,
        }

        return {
            "total_processed": total_processed,
            "valid_records": valid_records,
            "duplicate_records": duplicate_records,
            "failed_records": failed_records,
            "all_evaluated_rows": all_evaluated_rows,
            "address_level_count": address_level_count,
            "locality_centroid_count": locality_centroid_count,
            "manual_verification_count": manual_verification_count,
            "summary_stats": summary_stats,
        }

    def process_to_target_candidates(
        self,
        csv_file_path: Path,
        target_total_unique: int = 500,
        reference_files: Optional[List[Path]] = None,
        mark_as_candidates: bool = True,
    ) -> Dict[str, Any]:
        """Processes records sequentially until `target_total_unique` unique candidate
        companies are collected across all batches.

        Requirements enforced:
        1. CIN is the primary duplicate identifier across reference files and the current run.
        2. Strict validation rules (Active status, 560xxx pincode, Bengaluru evidence, valid coordinates).
        3. Clear entity classification: 'startup', 'established_company', 'uncertain_for_review'.
        4. Preserves geocoding source and confidence (nominatim_osm vs centroids).
        5. Sets candidate status (is_verified=False, candidate_status='needs_manual_verification').
        6. Audits all evaluated rows, duplicate records, and failed records.
        """
        reference_cins: Set[str] = set()
        reference_names: Set[str] = set()
        reference_records: List[Dict[str, Any]] = []

        if reference_files:
            for rf in reference_files:
                if rf and rf.exists():
                    with open(rf, "r", encoding="utf-8", errors="replace") as f:
                        ref_reader = csv.DictReader(f)
                        for r in ref_reader:
                            cin_val = (r.get("CIN") or r.get("cin") or "").strip()
                            if not cin_val or cin_val in reference_cins:
                                continue
                            reference_cins.add(cin_val)

                            legal_val = (r.get("Legal Name") or r.get("legal_name") or r.get("Display Name") or "").strip()
                            if legal_val:
                                reference_names.add(legal_val.lower())

                            disp_name = (r.get("Display Name") or r.get("name") or legal_val).strip()
                            slug_val = (r.get("Slug") or r.get("slug") or "").strip()
                            ind_val = (r.get("Industry") or r.get("industry") or "").strip()
                            mca_sec = (r.get("MCA Sector") or r.get("mca_classification") or "").strip()
                            loc_val = (r.get("Locality") or r.get("locality") or "").strip()
                            pin_val = (r.get("Postal Code") or r.get("postal_code") or "").strip()
                            addr_val = (r.get("Address") or r.get("address") or "").strip()

                            lat_val = float(r.get("Latitude") or r.get("latitude") or 0.0)
                            lng_val = float(r.get("Longitude") or r.get("longitude") or 0.0)
                            geo_src = (r.get("Geocoding Source") or r.get("geocoding_source") or "nominatim_osm").strip()
                            conf_val = (r.get("Confidence") or r.get("confidence") or "high").strip()

                            founded = None
                            try:
                                f_raw = r.get("Founded Year") or r.get("founded_year")
                                if f_raw:
                                    founded = int(float(f_raw))
                            except (ValueError, TypeError):
                                pass

                            auth_cap = 0.0
                            paid_cap = 0.0
                            try:
                                auth_cap = float(r.get("Authorized Capital") or r.get("authorized_capital") or 0)
                            except (ValueError, TypeError):
                                pass
                            try:
                                paid_cap = float(r.get("Paidup Capital") or r.get("paidup_capital") or 0)
                            except (ValueError, TypeError):
                                pass

                            reg_date = (r.get("Registration Date") or r.get("registration_date") or "").strip() or None

                            # Determine or preserve entity classification
                            entity_class = (r.get("Entity Classification") or r.get("entity_classification") or "").strip()
                            class_reason = (r.get("Classification Reason") or r.get("classification_reason") or "").strip()
                            if not entity_class:
                                entity_class, class_reason = classify_company_entity(
                                    name=disp_name,
                                    legal_name=legal_val,
                                    mca_sector=mca_sec or ind_val,
                                    founded_year=founded,
                                )

                            ref_candidate = {
                                "company": {
                                    "name": disp_name,
                                    "legal_name": legal_val,
                                    "cin": cin_val,
                                    "slug": slug_val,
                                    "industry": ind_val,
                                    "mca_classification": mca_sec,
                                    "company_category": r.get("Company Category", ""),
                                    "company_class": r.get("Company Class", "Private"),
                                    "listing_status": r.get("Listing Status", "Unlisted"),
                                    "founded_year": founded,
                                    "registration_date": reg_date,
                                    "authorized_capital": auth_cap,
                                    "paidup_capital": paid_cap,
                                    "entity_classification": entity_class,
                                    "classification_reason": class_reason,
                                    "is_verified": False if mark_as_candidates else True,
                                    "verification_status": "unverified_candidate" if mark_as_candidates else "verified_startup",
                                    "candidate_status": "needs_manual_verification",
                                    "candidate_notes": "MCA Master Data candidate from prior batch; pending manual verification.",
                                    "verification_source": f"MCA Company Master Data ({rf.stem})",
                                },
                                "office": {
                                    "address": addr_val,
                                    "locality": loc_val,
                                    "city": "Bengaluru",
                                    "state": "Karnataka",
                                    "postal_code": pin_val,
                                    "latitude": round(lat_val, 4),
                                    "longitude": round(lng_val, 4),
                                    "geocoding_source": geo_src,
                                    "geocoding_confidence": conf_val,
                                },
                            }
                            reference_records.append(ref_candidate)

        needed_new = max(0, target_total_unique - len(reference_records))
        new_valid_records: List[Dict[str, Any]] = []
        duplicate_records: List[Dict[str, Any]] = []
        failed_records: List[Dict[str, Any]] = []
        all_evaluated_rows: List[Dict[str, Any]] = []

        seen_batch_cins: Set[str] = set()
        seen_batch_names: Set[str] = set()

        failure_reasons_counter: Dict[str, int] = {}
        total_evaluated = 0

        with open(csv_file_path, "r", encoding="utf-8", errors="replace") as f:
            reader = csv.DictReader(f)

            for row_idx, row in enumerate(reader):
                if len(new_valid_records) >= needed_new:
                    break

                total_evaluated += 1

                cin = (row.get("CIN") or "").strip()
                legal_name = (row.get("Company Name") or "").strip()
                status = (row.get("Company Status") or "").strip().lower()
                pin_raw = row.get("Pin Code")
                pincode = clean_pincode(pin_raw)
                roc = (row.get("Company ROC") or "").strip().lower()
                state = (row.get("Company State") or "").strip().lower()
                addr = clean_address(row.get("Company Address") or "")

                display_name, slug = clean_company_name(legal_name) if legal_name else ("", "")
                locality = extract_locality_from_address(addr, pincode) if addr else "Bengaluru"
                industry = map_industry(row.get("Company Industrial Classification"))
                mca_sector = row.get("Company Industrial Classification", "")

                audit_entry: Dict[str, Any] = {
                    "row_index": row_idx,
                    "cin": cin,
                    "company_name": legal_name,
                    "display_name": display_name,
                    "raw_pin": pin_raw,
                    "postal_code": pincode,
                    "status": status,
                    "locality": locality,
                    "address": addr,
                }

                # 1. Duplicate Detection by CIN (Primary Identifier)
                is_duplicate = False
                duplicate_reason = ""

                if cin and cin in reference_cins:
                    is_duplicate = True
                    duplicate_reason = f"Duplicate CIN '{cin}' matches existing candidate batches"
                elif cin and cin in seen_batch_cins:
                    is_duplicate = True
                    duplicate_reason = f"Duplicate CIN '{cin}' repeated within current processing run"
                elif legal_name and legal_name.lower() in reference_names:
                    is_duplicate = True
                    duplicate_reason = f"Duplicate entity name '{legal_name}' matches existing candidate batches"
                elif legal_name and legal_name.lower() in seen_batch_names:
                    is_duplicate = True
                    duplicate_reason = f"Duplicate entity name '{legal_name}' repeated within current processing run"

                if is_duplicate:
                    lat, lng, geo_source, confidence = self.geocoder.geocode(locality, pincode, addr)
                    dup_record = {
                        "row_index": row_idx,
                        "cin": cin,
                        "legal_name": legal_name,
                        "display_name": display_name,
                        "slug": slug,
                        "industry": industry,
                        "locality": locality,
                        "postal_code": pincode or "",
                        "address": addr,
                        "latitude": round(lat, 4) if lat else None,
                        "longitude": round(lng, 4) if lng else None,
                        "geocoding_source": geo_source,
                        "confidence": confidence,
                        "duplicate_reason": duplicate_reason,
                        "duplicate_of": "prior_mca_batches",
                    }
                    duplicate_records.append(dup_record)
                    audit_entry["outcome"] = "DUPLICATE"
                    audit_entry["details"] = duplicate_reason
                    audit_entry["latitude"] = round(lat, 4) if lat else None
                    audit_entry["longitude"] = round(lng, 4) if lng else None
                    audit_entry["geocoding_source"] = geo_source
                    audit_entry["confidence"] = confidence
                    all_evaluated_rows.append(audit_entry)
                    continue

                seen_batch_cins.add(cin)
                seen_batch_names.add(legal_name.lower())

                # 2. Validation: Required fields
                if not cin or not legal_name:
                    reason = "Missing essential identifier: CIN or Company Name is empty"
                    failure_reasons_counter[reason] = failure_reasons_counter.get(reason, 0) + 1
                    failed_records.append({
                        "row_index": row_idx,
                        "cin": cin,
                        "company_name": legal_name,
                        "failure_stage": "REQUIRED_FIELDS",
                        "failure_reason": reason,
                    })
                    audit_entry["outcome"] = "FAILED"
                    audit_entry["details"] = reason
                    all_evaluated_rows.append(audit_entry)
                    continue

                # 3. Validation: Active Status
                if status != "active":
                    reason = f"Inactive company status: '{status or 'Unknown'}'"
                    failure_reasons_counter[reason] = failure_reasons_counter.get(reason, 0) + 1
                    failed_records.append({
                        "row_index": row_idx,
                        "cin": cin,
                        "company_name": legal_name,
                        "status": status,
                        "failure_stage": "COMPANY_STATUS",
                        "failure_reason": reason,
                    })
                    audit_entry["outcome"] = "FAILED"
                    audit_entry["details"] = reason
                    all_evaluated_rows.append(audit_entry)
                    continue

                # 4. Validation: Postal Code 560xxx
                if not pincode:
                    reason = f"Invalid or non-Bengaluru postal code: '{pin_raw}' (requires 560xxx)"
                    failure_reasons_counter[reason] = failure_reasons_counter.get(reason, 0) + 1
                    failed_records.append({
                        "row_index": row_idx,
                        "cin": cin,
                        "company_name": legal_name,
                        "raw_pin": pin_raw,
                        "failure_stage": "PINCODE_VALIDATION",
                        "failure_reason": reason,
                    })
                    audit_entry["outcome"] = "FAILED"
                    audit_entry["details"] = reason
                    all_evaluated_rows.append(audit_entry)
                    continue

                # 5. Validation: Location Evidence
                is_blr_evidence = (
                    "bangalore" in roc
                    or "karnataka" in state
                    or "bangalore" in addr.lower()
                    or "bengaluru" in addr.lower()
                )
                if not is_blr_evidence:
                    reason = "Registered address and ROC do not confirm Greater Bengaluru location"
                    failure_reasons_counter[reason] = failure_reasons_counter.get(reason, 0) + 1
                    failed_records.append({
                        "row_index": row_idx,
                        "cin": cin,
                        "company_name": legal_name,
                        "roc": roc,
                        "state": state,
                        "address": addr,
                        "failure_stage": "LOCATION_EVIDENCE",
                        "failure_reason": reason,
                    })
                    audit_entry["outcome"] = "FAILED"
                    audit_entry["details"] = reason
                    all_evaluated_rows.append(audit_entry)
                    continue

                # 6. Geocoding
                lat, lng, geo_source, confidence = self.geocoder.geocode(
                    locality=locality,
                    postal_code=pincode,
                    address=addr,
                )

                if not self.geocoder.is_within_bounds(lat, lng):
                    reason = f"Resolved coordinates ({lat}, {lng}) fall outside Greater Bengaluru bounding box"
                    failure_reasons_counter[reason] = failure_reasons_counter.get(reason, 0) + 1
                    failed_records.append({
                        "row_index": row_idx,
                        "cin": cin,
                        "company_name": legal_name,
                        "latitude": lat,
                        "longitude": lng,
                        "failure_stage": "GEOCODING_BOUNDS",
                        "failure_reason": reason,
                    })
                    audit_entry["outcome"] = "FAILED"
                    audit_entry["details"] = reason
                    all_evaluated_rows.append(audit_entry)
                    continue

                # Parse financials and founded year
                reg_date_str = (row.get("Company Registration Date") or "").strip()
                founded_year = None
                if reg_date_str:
                    try:
                        dt = datetime.strptime(reg_date_str, "%Y-%m-%d")
                        founded_year = dt.year
                    except ValueError:
                        pass

                try:
                    auth_cap = float(row.get("Authorized Capital", 0) or 0)
                except ValueError:
                    auth_cap = 0.0

                try:
                    paid_cap = float(row.get("Paidup Capital", 0) or 0)
                except ValueError:
                    paid_cap = 0.0

                # 7. Entity Classification
                entity_class, class_reason = classify_company_entity(
                    name=display_name,
                    legal_name=legal_name,
                    mca_sector=mca_sector,
                    founded_year=founded_year,
                )

                candidate_record = {
                    "company": {
                        "name": display_name,
                        "legal_name": legal_name,
                        "cin": cin,
                        "slug": slug,
                        "industry": industry,
                        "mca_classification": mca_sector,
                        "company_category": row.get("Company Category", ""),
                        "company_class": row.get("Company Class", "Private"),
                        "listing_status": row.get("Listing Status", "Unlisted"),
                        "founded_year": founded_year,
                        "registration_date": reg_date_str or None,
                        "authorized_capital": auth_cap,
                        "paidup_capital": paid_cap,
                        "entity_classification": entity_class,
                        "classification_reason": class_reason,
                        "is_verified": False if mark_as_candidates else True,
                        "verification_status": "unverified_candidate" if mark_as_candidates else "verified_startup",
                        "candidate_status": "needs_manual_verification",
                        "candidate_notes": "MCA Master Data candidate; pending manual verification by admin before publishing.",
                        "verification_source": "MCA Company Master Data (500-target expansion)",
                    },
                    "office": {
                        "address": addr,
                        "locality": locality,
                        "city": "Bengaluru",
                        "state": "Karnataka",
                        "postal_code": pincode,
                        "latitude": round(lat, 4),
                        "longitude": round(lng, 4),
                        "geocoding_source": geo_source,
                        "geocoding_confidence": confidence,
                    },
                }

                new_valid_records.append(candidate_record)

                audit_entry["outcome"] = "VALID_CANDIDATE"
                audit_entry["details"] = "Passed all validation rules"
                audit_entry["latitude"] = round(lat, 4)
                audit_entry["longitude"] = round(lng, 4)
                audit_entry["geocoding_source"] = geo_source
                audit_entry["confidence"] = confidence
                all_evaluated_rows.append(audit_entry)

        # Combine cumulative unique candidates across all batches
        all_unique_candidates = reference_records + new_valid_records

        # Calculate statistics across all 500 candidates
        address_level_count = sum(1 for c in all_unique_candidates if c["office"]["geocoding_source"] == "nominatim_osm")
        locality_centroid_count = sum(1 for c in all_unique_candidates if c["office"]["geocoding_source"] != "nominatim_osm")

        classifications_all: Dict[str, int] = {}
        for c in all_unique_candidates:
            cls = c["company"].get("entity_classification", "uncertain_for_review")
            classifications_all[cls] = classifications_all.get(cls, 0) + 1

        new_batch_classifications: Dict[str, int] = {}
        for c in new_valid_records:
            cls = c["company"].get("entity_classification", "uncertain_for_review")
            new_batch_classifications[cls] = new_batch_classifications.get(cls, 0) + 1

        localities_all: Dict[str, int] = {}
        industries_all: Dict[str, int] = {}
        for c in all_unique_candidates:
            loc = c["office"]["locality"]
            ind = c["company"]["industry"]
            localities_all[loc] = localities_all.get(loc, 0) + 1
            industries_all[ind] = industries_all.get(ind, 0) + 1

        summary_stats = {
            "total_evaluated_in_run": total_evaluated,
            "target_total_unique": target_total_unique,
            "cumulative_unique_candidates_count": len(all_unique_candidates),
            "new_candidates_count": len(new_valid_records),
            "reference_candidates_count": len(reference_records),
            "duplicate_records_count": len(duplicate_records),
            "failed_records_count": len(failed_records),
            "address_level_count": address_level_count,
            "locality_centroid_count": locality_centroid_count,
            "manual_verification_count": len(all_unique_candidates),
            "database_modified": False,
            "classification_distribution": classifications_all,
            "new_batch_classification_distribution": new_batch_classifications,
            "failure_reasons_breakdown": failure_reasons_counter,
            "locality_distribution": localities_all,
            "industry_distribution": industries_all,
        }

        return {
            "total_evaluated": total_evaluated,
            "all_unique_candidates": all_unique_candidates,
            "new_valid_records": new_valid_records,
            "reference_records": reference_records,
            "duplicate_records": duplicate_records,
            "failed_records": failed_records,
            "all_evaluated_rows": all_evaluated_rows,
            "address_level_count": address_level_count,
            "locality_centroid_count": locality_centroid_count,
            "manual_verification_count": len(all_unique_candidates),
            "summary_stats": summary_stats,
        }
