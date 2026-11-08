import json
import logging
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from fastapi import HTTPException, status

from app.schemas.candidate_verification import (
    CandidateCompanyItem,
    CandidateVerificationSummary,
    CandidateVerificationUpdate,
    PaginatedCandidatesResponse,
)
from app.pipeline.mca.geocoder import BengaluruGeocoder

logger = logging.getLogger(__name__)

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"
OUTPUT_DIR = DATA_DIR / "output"
CANDIDATES_JSON_PATH = OUTPUT_DIR / "mca_bengaluru_500_records.json"
VERIFICATIONS_STORE_PATH = OUTPUT_DIR / "candidate_verifications.json"

_file_lock = threading.Lock()


class CandidateVerificationService:
    """
    Manages the manual verification review workflow for MCA company candidates.
    Candidate records remain strictly isolated from production company, office, and job tables.
    Verification decisions and evidence are persisted in candidate_verifications.json.
    """

    def __init__(self, geocoder: Optional[BengaluruGeocoder] = None):
        self.geocoder = geocoder

    def _get_geocoder(self) -> BengaluruGeocoder:
        if self.geocoder is None:
            cache_file = OUTPUT_DIR / ".geocode_cache.json"
            self.geocoder = BengaluruGeocoder(
                cache_file=str(cache_file) if cache_file.exists() else None,
                use_online=False,
            )
        return self.geocoder

    def _load_stored_verifications(self) -> Dict[str, Dict[str, Any]]:
        """Loads persistent manual verification reviews from disk."""
        with _file_lock:
            if not VERIFICATIONS_STORE_PATH.exists():
                return {}
            try:
                with open(VERIFICATIONS_STORE_PATH, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error reading candidate verifications store: {e}")
                return {}

    def _save_stored_verifications(self, reviews: Dict[str, Dict[str, Any]]) -> None:
        """Atomically saves manual verification reviews to disk."""
        with _file_lock:
            OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            temp_path = VERIFICATIONS_STORE_PATH.with_suffix(".tmp")
            with open(temp_path, "w", encoding="utf-8") as f:
                json.dump(reviews, f, indent=2, ensure_ascii=False)
            temp_path.replace(VERIFICATIONS_STORE_PATH)

    def _load_candidate_records(self) -> List[Dict[str, Any]]:
        """
        Loads candidate records from the candidate dataset.
        Gracefully returns an empty list if the dataset is archived, missing, or empty.
        """
        if not CANDIDATES_JSON_PATH.exists():
            return []
        try:
            with open(CANDIDATES_JSON_PATH, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return []
                data = json.loads(content)
                if not isinstance(data, list):
                    return []
                return data
        except Exception as e:
            logger.warning(f"Failed to read candidate JSON dataset ({e}); returning empty list.")
            return []

    def _build_candidate_items(self) -> List[CandidateCompanyItem]:
        """Combines raw MCA candidate metadata with saved admin verification reviews."""
        raw_candidates = self._load_candidate_records()
        reviews = self._load_stored_verifications()

        items: List[CandidateCompanyItem] = []
        for raw in raw_candidates:
            comp = raw.get("company", {})
            off = raw.get("office", {})
            cin = comp.get("cin", "").strip()

            review = reviews.get(cin, {})

            # Current verification status (defaults to "Needs Review", never auto-verified)
            verif_status = review.get("verification_status") or "Needs Review"
            is_verified = (verif_status == "Verified")

            item = CandidateCompanyItem(
                cin=cin,
                name=comp.get("name", ""),
                legal_name=comp.get("legal_name", comp.get("name", "")),
                slug=comp.get("slug", ""),
                industry=comp.get("industry"),
                mca_sector=comp.get("mca_classification"),
                founded_year=comp.get("founded_year"),
                registration_date=comp.get("registration_date"),
                authorized_capital=comp.get("authorized_capital"),
                paidup_capital=comp.get("paidup_capital"),
                company_status=comp.get("listing_status") or "Active",
                entity_classification=comp.get("entity_classification") or "uncertain_for_review",
                classification_reason=comp.get("classification_reason"),
                registered_address=off.get("address", ""),
                postal_code=off.get("postal_code"),
                locality=off.get("locality"),
                latitude=off.get("latitude", 12.9716),
                longitude=off.get("longitude", 77.5946),
                geocoding_source=off.get("geocoding_source", "nominatim_osm"),
                confidence=off.get("geocoding_confidence", "high"),
                verification_status=verif_status,
                is_verified=is_verified,
                official_website=review.get("official_website"),
                evidence_url=review.get("evidence_url"),
                actual_operating_office_address=review.get("actual_operating_office_address"),
                operating_locality=review.get("operating_locality"),
                operating_pincode=review.get("operating_pincode"),
                operating_latitude=review.get("operating_latitude"),
                operating_longitude=review.get("operating_longitude"),
                reviewer_notes=review.get("reviewer_notes"),
                verification_date=review.get("verification_date"),
                reviewed_by=review.get("reviewed_by"),
                promoted_to_db=bool(review.get("promoted_to_db", False)),
                db_company_id=review.get("db_company_id"),
            )
            items.append(item)

        return items

    def compute_summary(self, items: Optional[List[CandidateCompanyItem]] = None) -> CandidateVerificationSummary:
        """Computes aggregate candidate verification statistics."""
        if items is None:
            items = self._build_candidate_items()

        total = len(items)
        needs_review = sum(1 for c in items if c.verification_status == "Needs Review")
        verified = sum(1 for c in items if c.verification_status == "Verified")
        rejected = sum(1 for c in items if c.verification_status == "Rejected")
        startups = sum(1 for c in items if c.entity_classification == "startup")
        established = sum(1 for c in items if c.entity_classification == "established_company")
        uncertain = sum(1 for c in items if c.entity_classification == "uncertain_for_review")
        operating_confirmed = sum(1 for c in items if c.actual_operating_office_address)
        website_confirmed = sum(1 for c in items if c.official_website)
        evidence_confirmed = sum(1 for c in items if c.evidence_url)

        return CandidateVerificationSummary(
            total_candidates=total,
            needs_review_count=needs_review,
            verified_count=verified,
            rejected_count=rejected,
            startup_count=startups,
            established_count=established,
            uncertain_count=uncertain,
            operating_office_confirmed_count=operating_confirmed,
            website_confirmed_count=website_confirmed,
            evidence_confirmed_count=evidence_confirmed,
        )

    def get_candidates(
        self,
        page: int = 1,
        limit: int = 20,
        status_filter: Optional[str] = None,
        classification: Optional[str] = None,
        industry: Optional[str] = None,
        locality: Optional[str] = None,
        search: Optional[str] = None,
        exclude_rejected: bool = False,
    ) -> PaginatedCandidatesResponse:
        """
        Retrieves paginated candidate companies with multi-criteria filtering
        and summary metrics.
        """
        all_items = self._build_candidate_items()
        summary = self.compute_summary(all_items)

        filtered = all_items

        # 1. Filter: Status or Active Review
        if status_filter and status_filter.strip().lower() != "all":
            norm_status = status_filter.strip().lower()
            if norm_status == "active_review":
                # Exclude rejected candidates from active review
                filtered = [c for c in filtered if c.verification_status != "Rejected"]
            else:
                filtered = [c for c in filtered if c.verification_status.lower() == norm_status]
        elif exclude_rejected:
            filtered = [c for c in filtered if c.verification_status != "Rejected"]

        # 2. Filter: Entity Classification
        if classification and classification.strip().lower() != "all":
            norm_cls = classification.strip().lower()
            filtered = [c for c in filtered if c.entity_classification.lower() == norm_cls]

        # 3. Filter: Industry
        if industry and industry.strip():
            norm_ind = industry.strip().lower()
            filtered = [c for c in filtered if norm_ind in (c.industry or "").lower() or norm_ind in (c.mca_sector or "").lower()]

        # 4. Filter: Locality
        if locality and locality.strip():
            norm_loc = locality.strip().lower()
            filtered = [c for c in filtered if norm_loc in (c.locality or "").lower()]

        # 5. Filter: Search Query
        if search and search.strip():
            q = search.strip().lower()
            filtered = [
                c for c in filtered
                if (
                    q in c.name.lower()
                    or q in c.legal_name.lower()
                    or q in c.cin.lower()
                    or q in c.registered_address.lower()
                    or (c.actual_operating_office_address and q in c.actual_operating_office_address.lower())
                )
            ]

        total = len(filtered)
        limit = max(1, min(limit, 100))
        total_pages = max(1, (total + limit - 1) // limit)
        page = max(1, min(page, total_pages)) if total > 0 else 1

        start = (page - 1) * limit
        end = start + limit
        paginated_items = filtered[start:end]

        return PaginatedCandidatesResponse(
            items=paginated_items,
            total=total,
            page=page,
            limit=limit,
            total_pages=total_pages,
            has_next=page < total_pages,
            has_prev=page > 1,
            summary=summary,
        )

    def get_candidate_by_cin(self, cin: str) -> CandidateCompanyItem:
        """Finds and returns a single candidate company item by CIN."""
        cin_clean = cin.strip().upper()
        items = self._build_candidate_items()
        for item in items:
            if item.cin.upper() == cin_clean:
                return item

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Candidate company not found with CIN: {cin}",
        )

    def update_candidate_verification(
        self,
        cin: str,
        payload: CandidateVerificationUpdate,
        reviewed_by: str = "superadmin",
    ) -> CandidateCompanyItem:
        """
        Updates verification review and saves evidence for a candidate company.
        Guarantees that production company/office/job tables are untouched.
        """
        cin_clean = cin.strip().upper()

        # Verify that candidate exists in 500 dataset
        item = self.get_candidate_by_cin(cin_clean)

        reviews = self._load_stored_verifications()

        op_lat = None
        op_lng = None
        # Geocode confirmed operating office if provided
        if payload.actual_operating_office_address and payload.actual_operating_office_address.strip():
            try:
                geocoder = self._get_geocoder()
                lat, lng, _, _ = geocoder.geocode(
                    locality=payload.operating_locality,
                    postal_code=payload.operating_pincode,
                    address=payload.actual_operating_office_address.strip(),
                )
                if geocoder.is_within_bounds(lat, lng):
                    op_lat = round(lat, 4)
                    op_lng = round(lng, 4)
            except Exception as e:
                logger.warning(f"Could not geocode operating office address for {cin}: {e}")

        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        # Persist review entry
        reviews[cin_clean] = {
            "cin": cin_clean,
            "verification_status": payload.verification_status,
            "official_website": payload.official_website.strip() if payload.official_website else None,
            "evidence_url": payload.evidence_url.strip() if payload.evidence_url else None,
            "actual_operating_office_address": payload.actual_operating_office_address.strip() if payload.actual_operating_office_address else None,
            "operating_locality": payload.operating_locality.strip() if payload.operating_locality else None,
            "operating_pincode": payload.operating_pincode.strip() if payload.operating_pincode else None,
            "operating_latitude": op_lat,
            "operating_longitude": op_lng,
            "reviewer_notes": payload.reviewer_notes.strip() if payload.reviewer_notes else None,
            "verification_date": now_iso,
            "reviewed_by": reviewed_by,
        }

        self._save_stored_verifications(reviews)

        # Return updated candidate record
        return self.get_candidate_by_cin(cin_clean)

    def promote_candidate_to_db(self, cin: str, db: Any) -> Dict[str, Any]:
        """
        Promotes an approved MCA candidate to the PostgreSQL companies and offices tables.
        Guarantees:
        - Candidate must be approved (status == 'Verified').
        - Avoids duplicate companies (matches by CIN or slug).
        - Avoids duplicate offices (matches by company + address).
        - Does NOT automatically create any jobs.
        - Updates verification store with promoted_to_db=True and db_company_id.
        """
        from app.models.company import Company
        from app.models.office import Office
        from app.pipeline.validation.validator import slugify
        from sqlalchemy import or_

        item = self.get_candidate_by_cin(cin)
        if item.verification_status != "Verified":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Candidate company '{item.name}' must be marked 'Verified' before promoting to database.",
            )

        # Check if company already exists in DB
        cin_clean = item.cin.strip().upper()
        existing_company = (
            db.query(Company)
            .filter(or_(Company.cin == cin_clean, Company.slug == item.slug))
            .first()
        )

        company_created = False
        if not existing_company:
            company = Company(
                name=item.name,
                slug=item.slug or slugify(item.name),
                cin=cin_clean,
                website=item.official_website,
                industry=item.industry or "Technology",
                description=f"Verified MCA tech enterprise registered in Bengaluru (CIN: {cin_clean}).",
                founded_year=item.founded_year,
                is_verified=True,
            )
            db.add(company)
            db.flush()
            company_created = True
        else:
            company = existing_company
            company.is_verified = True
            if not company.cin:
                company.cin = cin_clean
            if item.official_website and not company.website:
                company.website = item.official_website
            db.flush()

        # Office creation: prefer confirmed actual operating office, fallback to registered address
        office_addr = item.actual_operating_office_address or item.registered_address
        locality = item.operating_locality or item.locality or "Bengaluru"
        pincode = item.operating_pincode or item.postal_code
        lat = item.operating_latitude if item.operating_latitude is not None else item.latitude
        lng = item.operating_longitude if item.operating_longitude is not None else item.longitude

        existing_office = (
            db.query(Office)
            .filter(Office.company_id == company.id, Office.address == office_addr)
            .first()
        )
        office_created = False
        if not existing_office:
            office = Office(
                company_id=company.id,
                name="Headquarters" if not company.offices else f"Office - {locality}",
                address=office_addr,
                locality=locality,
                city="Bengaluru",
                state="Karnataka",
                postal_code=pincode,
                latitude=lat,
                longitude=lng,
                is_headquarters=True if not company.offices else False,
            )
            db.add(office)
            db.flush()
            office_created = True
        else:
            office = existing_office

        db.commit()

        # Update verification store with promotion metadata
        reviews = self._load_stored_verifications()
        if cin_clean not in reviews:
            reviews[cin_clean] = {}
        reviews[cin_clean]["promoted_to_db"] = True
        reviews[cin_clean]["db_company_id"] = company.id
        reviews[cin_clean]["promoted_at"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        self._save_stored_verifications(reviews)

        return {
            "success": True,
            "company_id": company.id,
            "company_name": company.name,
            "company_slug": company.slug,
            "company_created": company_created,
            "office_id": office.id,
            "office_created": office_created,
            "message": f"Successfully promoted '{company.name}' to PostgreSQL as an approved company.",
        }
