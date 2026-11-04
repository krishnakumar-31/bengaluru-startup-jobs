import re
from datetime import datetime
from typing import Any, Dict, List, Optional, Set
from app.pipeline.config import (
    ALLOWED_CURRENCIES,
    ALLOWED_EMPLOYMENT_TYPES,
    ALLOWED_EXPERIENCE_LEVELS,
)
from app.pipeline.models import (
    RawCompanyData,
    RawJobData,
    RawOfficeData,
    RawStartupRecord,
    RejectedRecord,
    ValidatedCompany,
    ValidatedJob,
    ValidatedOffice,
    ValidatedStartupRecord,
    ValidationBatch,
    ValidationIssue,
)
from app.pipeline.validation.geo import (
    validate_bengaluru_city_and_state,
    validate_bengaluru_coordinates,
    validate_bengaluru_locality,
    validate_bengaluru_postal_code,
)
from app.pipeline.validation.url import validate_web_url


def slugify(text: str) -> str:
    """Generate a clean URL-safe slug from arbitrary text."""
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    return re.sub(r"[\s-]+", "-", text).strip("-")


class PipelineValidator:
    """Production-grade validator for Bengaluru startup profiles, office locations,

    and job listings. Ensures data integrity and enforces strict geographic bounds.
    """

    def __init__(self, allow_localhost_urls: bool = False):
        self.allow_localhost = allow_localhost_urls
        self.seen_company_slugs: Set[str] = set()
        self.seen_job_urls: Set[str] = set()
        self.seen_job_slugs: Set[str] = set()

    def reset_deduplication_cache(self) -> None:
        """Reset in-batch duplicate tracking sets."""
        self.seen_company_slugs.clear()
        self.seen_job_urls.clear()
        self.seen_job_slugs.clear()

    def validate_batch(
        self, records: List[RawStartupRecord]
    ) -> ValidationBatch:
        """Validate a list of raw startup records, separating accepted valid records

        from rejected records with granular error diagnostics.
        """
        self.reset_deduplication_cache()
        batch = ValidationBatch(total_processed=len(records))

        for raw_record in records:
            valid_record, issues = self.validate_record(raw_record)
            if valid_record and not any(i.severity == "error" for i in issues):
                batch.accepted.append(valid_record)
            else:
                batch.rejected.append(
                    RejectedRecord(
                        company_name=raw_record.company.name if raw_record.company else None,
                        raw_record=raw_record.model_dump(mode="json"),
                        issues=issues,
                    )
                )

        return batch

    def validate_record(
        self, record: RawStartupRecord
    ) -> tuple[Optional[ValidatedStartupRecord], List[ValidationIssue]]:
        """Validate an individual startup record (company + offices + jobs)."""
        issues: List[ValidationIssue] = []

        # 1. Validate Company
        valid_company, comp_issues = self._validate_company(record.company)
        issues.extend(comp_issues)

        # 2. Validate Offices (At least one verified Bengaluru office is required)
        valid_offices: List[ValidatedOffice] = []
        if not record.offices:
            issues.append(
                ValidationIssue(
                    field="offices",
                    message="At least one physical office location in Bengaluru is required.",
                )
            )
        else:
            for idx, off in enumerate(record.offices):
                v_off, off_issues = self._validate_office(off, idx=idx)
                issues.extend(off_issues)
                if v_off:
                    valid_offices.append(v_off)

        # 3. Validate Jobs
        valid_jobs: List[ValidatedJob] = []
        comp_slug = valid_company.slug if valid_company else slugify(record.company.name or "")
        for idx, jb in enumerate(record.jobs):
            v_job, jb_issues = self._validate_job(jb, company_slug=comp_slug, idx=idx)
            issues.extend(jb_issues)
            if v_job:
                valid_jobs.append(v_job)

        has_errors = any(i.severity == "error" for i in issues)
        if has_errors or not valid_company or not valid_offices:
            return None, issues

        validated_record = ValidatedStartupRecord(
            company=valid_company,
            offices=valid_offices,
            jobs=valid_jobs,
        )
        return validated_record, issues

    def _validate_company(
        self, comp: RawCompanyData
    ) -> tuple[Optional[ValidatedCompany], List[ValidationIssue]]:
        issues: List[ValidationIssue] = []

        if not comp.name or not comp.name.strip():
            issues.append(
                ValidationIssue(
                    field="company.name",
                    message="Company name is required.",
                )
            )
            return None, issues

        clean_name = comp.name.strip()
        slug = comp.slug.strip().lower() if comp.slug and comp.slug.strip() else slugify(clean_name)

        # Duplicate company check in current batch
        if slug in self.seen_company_slugs:
            issues.append(
                ValidationIssue(
                    field="company.slug",
                    message=f"Duplicate company slug '{slug}' encountered in the current batch.",
                )
            )
            return None, issues
        self.seen_company_slugs.add(slug)

        # Website validation
        is_web_valid, web_issues, norm_website = validate_web_url(
            comp.website,
            field_name="company.website",
            required=True,
            allow_localhost=self.allow_localhost,
        )
        issues.extend(web_issues)

        # Logo URL validation
        norm_logo = None
        if comp.logo_url and comp.logo_url.strip():
            _, logo_issues, norm_logo = validate_web_url(
                comp.logo_url,
                field_name="company.logo_url",
                required=False,
                allow_localhost=self.allow_localhost,
            )
            issues.extend(logo_issues)

        # Description
        clean_desc = (comp.description or "").strip()
        if not clean_desc:
            issues.append(
                ValidationIssue(
                    field="company.description",
                    message="Company description is required.",
                )
            )

        # Industry
        clean_ind = (comp.industry or "").strip()
        if not clean_ind:
            issues.append(
                ValidationIssue(
                    field="company.industry",
                    message="Company industry sector (e.g., FinTech, SaaS, AI/ML) is required.",
                )
            )

        # Founded year check
        if comp.founded_year is not None:
            curr_year = datetime.now().year
            if not (1980 <= comp.founded_year <= curr_year):
                issues.append(
                    ValidationIssue(
                        field="company.founded_year",
                        message=f"Founded year must be between 1980 and {curr_year} (got {comp.founded_year}).",
                    )
                )

        if any(i.severity == "error" for i in issues):
            return None, issues

        validated = ValidatedCompany(
            name=clean_name,
            slug=slug,
            description=clean_desc,
            website=norm_website or comp.website,
            logo_url=norm_logo,
            industry=clean_ind,
            company_size=comp.company_size,
            founded_year=comp.founded_year,
            is_verified=comp.is_verified,
        )
        return validated, issues

    def _validate_office(
        self, off: RawOfficeData, idx: int = 0
    ) -> tuple[Optional[ValidatedOffice], List[ValidationIssue]]:
        issues: List[ValidationIssue] = []
        prefix = f"offices[{idx}]"

        clean_address = (off.address or "").strip()
        if not clean_address:
            issues.append(
                ValidationIssue(
                    field=f"{prefix}.address",
                    message="Physical office street address is required.",
                )
            )

        # Locality check
        _, loc_issues, clean_locality = validate_bengaluru_locality(
            off.locality, field_prefix=prefix
        )
        issues.extend(loc_issues)

        # City & State check
        _, cs_issues, norm_city, norm_state = validate_bengaluru_city_and_state(
            off.city, off.state, field_prefix=prefix
        )
        issues.extend(cs_issues)

        # Postal code check
        _, pc_issues = validate_bengaluru_postal_code(
            off.postal_code, field_prefix=prefix
        )
        issues.extend(pc_issues)

        # Coordinates check
        _, coord_issues = validate_bengaluru_coordinates(
            off.latitude, off.longitude, field_prefix=prefix
        )
        issues.extend(coord_issues)

        if any(i.severity == "error" for i in issues):
            return None, issues

        validated = ValidatedOffice(
            address=clean_address,
            locality=clean_locality,
            city=norm_city,
            state=norm_state,
            postal_code=str(off.postal_code).strip(),
            latitude=float(off.latitude),  # type: ignore
            longitude=float(off.longitude),  # type: ignore
        )
        return validated, issues

    def _validate_job(
        self, jb: RawJobData, company_slug: str, idx: int = 0
    ) -> tuple[Optional[ValidatedJob], List[ValidationIssue]]:
        issues: List[ValidationIssue] = []
        prefix = f"jobs[{idx}]"

        clean_title = (jb.title or "").strip()
        if not clean_title:
            issues.append(
                ValidationIssue(
                    field=f"{prefix}.title",
                    message="Job title is required.",
                )
            )
            return None, issues

        # Job slug
        if jb.slug and jb.slug.strip():
            slug = jb.slug.strip().lower()
        else:
            slug = f"{company_slug}-{slugify(clean_title)}"

        # In-batch duplicate job slug check
        if slug in self.seen_job_slugs:
            issues.append(
                ValidationIssue(
                    field=f"{prefix}.slug",
                    message=f"Duplicate job slug '{slug}' encountered in the current batch.",
                )
            )
        self.seen_job_slugs.add(slug)

        clean_desc = (jb.description or "").strip()
        if not clean_desc:
            issues.append(
                ValidationIssue(
                    field=f"{prefix}.description",
                    message="Job description is required.",
                )
            )

        # URLs
        _, app_issues, norm_app_url = validate_web_url(
            jb.application_url,
            field_name=f"{prefix}.application_url",
            required=True,
            allow_localhost=self.allow_localhost,
        )
        issues.extend(app_issues)

        if norm_app_url:
            if norm_app_url in self.seen_job_urls:
                issues.append(
                    ValidationIssue(
                        field=f"{prefix}.application_url",
                        message=f"Duplicate application URL '{norm_app_url}' encountered in batch.",
                    )
                )
            self.seen_job_urls.add(norm_app_url)

        _, src_issues, norm_src_url = validate_web_url(
            jb.source_url,
            field_name=f"{prefix}.source_url",
            required=True,
            allow_localhost=self.allow_localhost,
        )
        issues.extend(src_issues)

        clean_src_name = (jb.source_name or "").strip()
        if not clean_src_name:
            issues.append(
                ValidationIssue(
                    field=f"{prefix}.source_name",
                    message="Original source name (e.g. 'company_careers', 'greenhouse') is required.",
                )
            )

        # Employment type
        clean_emp = (jb.employment_type or "full-time").strip().lower()
        if clean_emp not in ALLOWED_EMPLOYMENT_TYPES:
            issues.append(
                ValidationIssue(
                    field=f"{prefix}.employment_type",
                    message=(
                        f"Employment type '{clean_emp}' is invalid. Allowed: {sorted(ALLOWED_EMPLOYMENT_TYPES)}"
                    ),
                )
            )

        # Experience level
        clean_exp = (jb.experience_level or "mid").strip().lower()
        if clean_exp not in ALLOWED_EXPERIENCE_LEVELS:
            issues.append(
                ValidationIssue(
                    field=f"{prefix}.experience_level",
                    message=(
                        f"Experience level '{clean_exp}' is invalid. Allowed: {sorted(ALLOWED_EXPERIENCE_LEVELS)}"
                    ),
                    severity="warning",
                )
            )

        # Salary min and max check
        if jb.salary_min is not None and jb.salary_min < 0:
            issues.append(
                ValidationIssue(
                    field=f"{prefix}.salary_min",
                    message=f"salary_min cannot be negative (got {jb.salary_min}).",
                )
            )

        if jb.salary_max is not None and jb.salary_max < 0:
            issues.append(
                ValidationIssue(
                    field=f"{prefix}.salary_max",
                    message=f"salary_max cannot be negative (got {jb.salary_max}).",
                )
            )

        if (
            jb.salary_min is not None
            and jb.salary_max is not None
            and jb.salary_min > jb.salary_max
        ):
            issues.append(
                ValidationIssue(
                    field=f"{prefix}.salary",
                    message=(
                        f"salary_min ({jb.salary_min}) cannot exceed salary_max ({jb.salary_max})."
                    ),
                )
            )

        # Currency
        clean_curr = (jb.currency or "INR").strip().upper()
        if clean_curr not in ALLOWED_CURRENCIES:
            issues.append(
                ValidationIssue(
                    field=f"{prefix}.currency",
                    message=f"Currency '{clean_curr}' not supported. Allowed: {sorted(ALLOWED_CURRENCIES)}",
                    severity="warning",
                )
            )

        # Skills list
        clean_skills = [str(s).strip() for s in (jb.skills or []) if str(s).strip()]

        # Date consistency
        if jb.posted_at and jb.expires_at and jb.posted_at > jb.expires_at:
            issues.append(
                ValidationIssue(
                    field=f"{prefix}.expires_at",
                    message="Job posting date cannot be after expiration date.",
                )
            )

        if any(i.severity == "error" for i in issues):
            return None, issues

        validated = ValidatedJob(
            title=clean_title,
            slug=slug,
            description=clean_desc,
            employment_type=clean_emp,
            experience_level=clean_exp,
            salary_min=jb.salary_min,
            salary_max=jb.salary_max,
            currency=clean_curr,
            skills=clean_skills,
            application_url=norm_app_url or jb.application_url,
            status=(jb.status or "active").strip().lower(),
            source_name=clean_src_name,
            source_url=norm_src_url or jb.source_url,
            posted_at=jb.posted_at,
            expires_at=jb.expires_at,
            office_locality=jb.office_locality,
        )
        return validated, issues
