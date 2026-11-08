import csv
import io
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Set, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, func

from app.models.company import Company
from app.models.office import Office
from app.models.job import Job
from app.models.job_source import JobSource
from app.pipeline.validation.url import validate_web_url
from app.pipeline.validation.geo import (
    validate_bengaluru_coordinates,
    validate_bengaluru_postal_code,
)
from app.pipeline.validation.validator import slugify
from app.schemas.admin import (
    ImportPreviewItem,
    ImportPreviewResponse,
    ImportConfirmResponse,
)

EXPECTED_CSV_HEADERS = [
    "companyName",
    "companySlug",
    "companyCIN",
    "companyWebsite",
    "companyEmail",
    "companyPhone",
    "industry",
    "companyDescription",
    "companyLogoUrl",
    "officeName",
    "officeAddress",
    "locality",
    "city",
    "state",
    "pincode",
    "latitude",
    "longitude",
    "isHeadquarters",
    "jobTitle",
    "jobSlug",
    "jobDescription",
    "skills",
    "experienceMinYears",
    "experienceMaxYears",
    "employmentType",
    "workMode",
    "vacancies",
    "salaryMin",
    "salaryMax",
    "salaryCurrency",
    "applicationUrl",
    "jobSourceUrl",
    "jobPostedAt",
    "jobExpiresAt",
    "jobStatus",
]
UNIFIED_CSV_COLUMNS = EXPECTED_CSV_HEADERS


def sanitize_csv_cell(value: Any) -> str:
    """Protects against CSV Formula Injection (CWE-1236) by prepending a single quote to dangerous prefixes."""
    val_str = str(value or "")
    if val_str and val_str[0] in ("=", "+", "-", "@", "\t", "\r"):
        return f"'{val_str}"
    return val_str


def normalize_header(header: str) -> str:
    """Normalizes a CSV header by removing BOM, zero-width characters, surrounding quotes, and whitespace."""
    if not header:
        return ""
    # Strip invisible zero-width and BOM characters
    cleaned = (
        header.replace("\ufeff", "")
        .replace("\u200b", "")
        .replace("\u200c", "")
        .replace("\u200d", "")
        .replace("\u200e", "")
        .replace("\u200f", "")
        .replace("\xa0", " ")
        .strip()
    )
    # Strip enclosing quotation marks if any
    if (cleaned.startswith('"') and cleaned.endswith('"')) or (cleaned.startswith("'") and cleaned.endswith("'")):
        cleaned = cleaned[1:-1].strip()
    return cleaned


def detect_csv_delimiter(csv_content: str) -> str:
    """
    Safely detects whether the CSV content uses a comma (,), semicolon (;), or tab (\\t) delimiter.
    Matches first-row headers against the expected 35-column schema, falling back to character count.
    """
    clean_sample = csv_content.lstrip("\ufeff").strip()
    if not clean_sample:
        return ","

    expected_set = {h.lower() for h in EXPECTED_CSV_HEADERS}
    candidates = [",", ";", "\t"]

    best_delim = ","
    max_matches = 0

    for delim in candidates:
        try:
            reader = csv.reader(io.StringIO(clean_sample), delimiter=delim)
            first_row = next(reader, None)
            if first_row:
                norm_headers = {
                    normalize_header(c).lower() for c in first_row if c
                }
                matches = len(norm_headers.intersection(expected_set))
                if matches > max_matches:
                    max_matches = matches
                    best_delim = delim
        except Exception:
            continue

    if max_matches > 0:
        return best_delim

    # Fallback: Count delimiter occurrences in the first non-empty line
    first_line = clean_sample.split("\n", 1)[0]
    counts = {d: first_line.count(d) for d in candidates}
    sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)
    if sorted_counts and sorted_counts[0][1] > 0:
        return sorted_counts[0][0]

    return ","


class UnifiedImportService:
    sanitize_csv_value = staticmethod(sanitize_csv_cell)
    normalize_header = staticmethod(normalize_header)
    detect_csv_delimiter = staticmethod(detect_csv_delimiter)

    def __init__(self, db: Session):
        self.db = db

    @classmethod
    def get_template_csv(cls) -> str:
        """Returns the CSV template string with headers and realistic sample rows."""
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(EXPECTED_CSV_HEADERS)
        # Sample row 1: Full company, office, and job
        writer.writerow([
            "Nexus AI Labs", "nexus-ai-labs", "U72900KA2023PTC178901", "https://nexusailabs.io",
            "careers@nexusailabs.io", "+91-80-45678901", "Artificial Intelligence",
            "Building next-generation generative AI infrastructure for enterprise engineering teams.",
            "https://nexusailabs.io/logo.png",
            "Headquarters - Koramangala", "Plot 12, 80 Feet Road, 4th Block, Koramangala",
            "Koramangala", "Bengaluru", "Karnataka", "560034", "12.9345", "77.6258", "TRUE",
            "Senior ML Systems Engineer", "nexus-ai-labs-senior-ml-engineer",
            "Lead architecture and optimization of distributed large language model inference clusters.",
            "Python,PyTorch,CUDA,Distributed Systems,Kubernetes", "4", "8",
            "full-time", "in-office", "2", "2800000", "4500000", "INR",
            "https://nexusailabs.io/careers/senior-ml-engineer",
            "https://linkedin.com/jobs/view/12345678", "2026-11-01", "2026-12-31", "active"
        ])
        # Sample row 2: Same company, second job (demonstrating multiple jobs per company)
        writer.writerow([
            "Nexus AI Labs", "nexus-ai-labs", "U72900KA2023PTC178901", "https://nexusailabs.io",
            "careers@nexusailabs.io", "+91-80-45678901", "Artificial Intelligence",
            "Building next-generation generative AI infrastructure for enterprise engineering teams.",
            "https://nexusailabs.io/logo.png",
            "Headquarters - Koramangala", "Plot 12, 80 Feet Road, 4th Block, Koramangala",
            "Koramangala", "Bengaluru", "Karnataka", "560034", "12.9345", "77.6258", "TRUE",
            "Frontend Engineer - Design Systems", "nexus-ai-labs-frontend-engineer",
            "Build reactive web interfaces and developer telemetry portals using React, TypeScript and Tailwind.",
            "React,TypeScript,TailwindCSS,Next.js", "2", "5",
            "full-time", "hybrid", "1", "1800000", "2800000", "INR",
            "https://nexusailabs.io/careers/frontend-engineer",
            "https://linkedin.com/jobs/view/12345679", "2026-11-02", "2026-12-31", "active"
        ])
        # Sample row 3: Same company, secondary office in Whitefield (demonstrating multiple offices)
        writer.writerow([
            "Nexus AI Labs", "nexus-ai-labs", "U72900KA2023PTC178901", "https://nexusailabs.io",
            "careers@nexusailabs.io", "+91-80-45678901", "Artificial Intelligence",
            "Building next-generation generative AI infrastructure for enterprise engineering teams.",
            "https://nexusailabs.io/logo.png",
            "R&D Hub - Whitefield", "Unit 405, ITPL Road, Whitefield",
            "Whitefield", "Bengaluru", "Karnataka", "560066", "12.9840", "77.7490", "FALSE",
            "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""
        ])
        # Sample row 4: Company-only row (office & job fields optional)
        writer.writerow([
            "Kavach Security", "kavach-security", "U74999KA2024PTC189002", "https://kavachsec.in",
            "contact@kavachsec.in", "", "Cybersecurity",
            "Cloud-native threat detection and compliance automation platform.",
            "",
            "Bengaluru Cyber Center", "HSR Layout Sector 1", "HSR Layout", "Bengaluru", "Karnataka", "560102",
            "12.9121", "77.6446", "TRUE",
            "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""
        ])
        return output.getvalue()

    def validate_and_preview_csv(self, csv_content: str) -> ImportPreviewResponse:
        """Parses and validates CSV content, checking duplicates and constraints before importing."""
        clean_content = csv_content.lstrip("\ufeff")
        delimiter = detect_csv_delimiter(clean_content)

        f = io.StringIO(clean_content)
        reader = csv.reader(f, delimiter=delimiter)

        try:
            headers = next(reader)
        except StopIteration:
            return ImportPreviewResponse(
                total_records=0,
                accepted_count=0,
                rejected_count=0,
                items=[],
                raw_accepted_json="[]",
            )

        # Normalize headers for case-insensitive matching, stripping BOM, zero-width chars, and whitespace
        clean_headers = [normalize_header(h) for h in headers]
        header_map: Dict[str, int] = {}
        for idx, h in enumerate(clean_headers):
            key = h.lower()
            if key and key not in header_map:
                header_map[key] = idx

        missing_required_headers = []
        for req in EXPECTED_CSV_HEADERS:
            if req.lower() not in header_map:
                missing_required_headers.append(req)

        if missing_required_headers:
            item = ImportPreviewItem(
                row_number=1,
                company_name="Header Error",
                company_slug="header-error",
                valid=False,
                issues=[f"Missing expected CSV header(s): {', '.join(missing_required_headers)}"],
            )
            return ImportPreviewResponse(
                total_records=1,
                accepted_count=0,
                rejected_count=1,
                items=[item],
                raw_accepted_json="[]",
            )

        def get_val(row: List[str], col_name: str) -> str:
            idx = header_map.get(col_name.lower())
            if idx is not None and idx < len(row):
                return row[idx].strip()
            return ""

        # Tracking across batch & existing DB records to identify duplicates
        seen_companies: Dict[str, Dict[str, Any]] = {}  # key -> company metadata
        seen_offices: Set[Tuple[str, str]] = set()      # (company_key, norm_address)
        seen_jobs: Set[Tuple[str, str]] = set()         # (company_key, job_slug)

        items: List[ImportPreviewItem] = []
        accepted_records: List[Dict[str, Any]] = []

        total_accepted = 0
        total_rejected = 0

        row_num = 1
        for row in reader:
            row_num += 1
            if not row or not any(row):
                continue  # skip blank lines

            issues: List[str] = []
            warnings: List[str] = []

            comp_name = get_val(row, "companyName")
            comp_slug = get_val(row, "companySlug")
            comp_cin = get_val(row, "companyCIN")
            comp_website = get_val(row, "companyWebsite")
            comp_email = get_val(row, "companyEmail")
            comp_phone = get_val(row, "companyPhone")
            industry = get_val(row, "industry") or "Technology"
            comp_desc = get_val(row, "companyDescription") or "Technology company in Bengaluru."
            comp_logo = get_val(row, "companyLogoUrl")

            # 1. Company Validation
            if not comp_name:
                issues.append("companyName is required.")
                comp_slug = "unknown-company"
            else:
                if not comp_slug:
                    comp_slug = slugify(comp_name)

            if comp_website:
                valid_url, url_issues, _ = validate_web_url(comp_website, "companyWebsite", required=False)
                if not valid_url:
                    issues.extend([iss.message for iss in url_issues])

            if comp_email:
                if not re.match(r"^[^@]+@[^@]+\.[^@]+$", comp_email):
                    issues.append(f"Invalid companyEmail format: '{comp_email}'")

            # Duplicate company key
            company_key = comp_cin.upper() if comp_cin else comp_slug.lower()
            is_dup_comp = False

            # Check if company already exists in DB
            db_company = None
            if comp_cin:
                db_company = self.db.query(Company).filter(Company.cin == comp_cin.strip()).first()
            if not db_company and comp_slug:
                db_company = self.db.query(Company).filter(Company.slug == comp_slug.strip().lower()).first()

            if db_company:
                is_dup_comp = True
                warnings.append(f"Company '{comp_name}' already exists in database (ID {db_company.id}); existing record will be reused.")
            elif company_key in seen_companies:
                is_dup_comp = True
                warnings.append(f"Company '{comp_name}' appeared in earlier row; entity will be reused.")

            # 2. Office Validation
            office_name = get_val(row, "officeName")
            office_addr = get_val(row, "officeAddress")
            locality = get_val(row, "locality") or "Bengaluru"
            city = get_val(row, "city") or "Bengaluru"
            state = get_val(row, "state") or "Karnataka"
            pincode = get_val(row, "pincode")
            lat_str = get_val(row, "latitude")
            lng_str = get_val(row, "longitude")
            is_hq_str = get_val(row, "isHeadquarters").lower()
            is_hq = is_hq_str in ("true", "1", "yes", "t", "y")

            if city and city.strip().lower() not in ("bengaluru", "bangalore"):
                issues.append(f"Office city must be Bengaluru / Bangalore (got '{city}').")

            latitude = None
            longitude = None
            if lat_str or lng_str:
                try:
                    lat_val = float(lat_str)
                    lng_val = float(lng_str)
                    is_valid_geo, geo_issues = validate_bengaluru_coordinates(lat_val, lng_val)
                    if not is_valid_geo:
                        issues.extend([iss.message for iss in geo_issues])
                    else:
                        latitude = lat_val
                        longitude = lng_val
                except ValueError:
                    issues.append(f"Invalid latitude or longitude numeric values: '{lat_str}', '{lng_str}'")

            if pincode:
                is_valid_pin, pin_issues = validate_bengaluru_postal_code(pincode)
                if not is_valid_pin:
                    issues.extend([iss.message for iss in pin_issues])

            norm_office_addr = (office_addr or f"{locality}-{city}").lower().strip()
            office_key = (company_key, norm_office_addr)
            is_dup_office = office_key in seen_offices

            # 3. Job Validation
            job_title = get_val(row, "jobTitle")
            job_slug = get_val(row, "jobSlug")
            job_desc = get_val(row, "jobDescription")
            skills_raw = get_val(row, "skills")
            exp_min_str = get_val(row, "experienceMinYears")
            exp_max_str = get_val(row, "experienceMaxYears")
            emp_type = get_val(row, "employmentType") or "full-time"
            work_mode = get_val(row, "workMode") or "in-office"
            vacancies_str = get_val(row, "vacancies") or "1"
            sal_min_str = get_val(row, "salaryMin")
            sal_max_str = get_val(row, "salaryMax")
            currency = get_val(row, "salaryCurrency") or "INR"
            app_url = get_val(row, "applicationUrl")
            job_src_url = get_val(row, "jobSourceUrl")
            posted_at_str = get_val(row, "jobPostedAt")
            expires_at_str = get_val(row, "jobExpiresAt")
            job_status = get_val(row, "jobStatus") or "active"

            has_job = bool(job_title)
            is_dup_job = False

            exp_min = None
            exp_max = None
            sal_min = None
            sal_max = None
            vacancies = 1
            skills_list: List[str] = []

            if has_job:
                if not job_slug:
                    job_slug = slugify(f"{comp_slug}-{job_title}")

                if not job_desc:
                    job_desc = f"{job_title} role at {comp_name}."

                if skills_raw:
                    skills_list = [s.strip() for s in skills_raw.split(",") if s.strip()]

                if exp_min_str:
                    try:
                        exp_min = int(exp_min_str)
                        if exp_min < 0:
                            issues.append("experienceMinYears cannot be negative.")
                    except ValueError:
                        issues.append(f"Invalid experienceMinYears: '{exp_min_str}'")

                if exp_max_str:
                    try:
                        exp_max = int(exp_max_str)
                        if exp_max < 0:
                            issues.append("experienceMaxYears cannot be negative.")
                    except ValueError:
                        issues.append(f"Invalid experienceMaxYears: '{exp_max_str}'")

                if exp_min is not None and exp_max is not None and exp_min > exp_max:
                    issues.append("experienceMinYears cannot be greater than experienceMaxYears.")

                if vacancies_str:
                    try:
                        vacancies = max(1, int(vacancies_str))
                    except ValueError:
                        issues.append(f"Invalid vacancies integer: '{vacancies_str}'")

                if sal_min_str:
                    try:
                        sal_min = int(sal_min_str)
                        if sal_min < 0:
                            issues.append("salaryMin cannot be negative.")
                    except ValueError:
                        issues.append(f"Invalid salaryMin: '{sal_min_str}'")

                if sal_max_str:
                    try:
                        sal_max = int(sal_max_str)
                        if sal_max < 0:
                            issues.append("salaryMax cannot be negative.")
                    except ValueError:
                        issues.append(f"Invalid salaryMax: '{sal_max_str}'")

                if sal_min is not None and sal_max is not None and sal_min > sal_max:
                    issues.append("salaryMin cannot exceed salaryMax.")

                if app_url:
                    val_app_url, app_issues, _ = validate_web_url(app_url, "applicationUrl", required=False)
                    if not val_app_url:
                        issues.extend([iss.message for iss in app_issues])
                else:
                    app_url = comp_website or "https://example.com"

                if job_src_url:
                    val_src_url, src_issues, _ = validate_web_url(job_src_url, "jobSourceUrl", required=False)
                    if not val_src_url:
                        issues.extend([iss.message for iss in src_issues])

                job_key = (company_key, job_slug.lower())
                if job_key in seen_jobs:
                    is_dup_job = True
                    warnings.append(f"Job slug '{job_slug}' repeated in CSV; second occurrence will be skipped.")
                else:
                    seen_jobs.add(job_key)

            is_valid = len(issues) == 0

            if is_valid:
                total_accepted += 1
                seen_companies[company_key] = {
                    "name": comp_name,
                    "slug": comp_slug,
                    "cin": comp_cin,
                    "website": comp_website,
                    "email": comp_email,
                    "phone": comp_phone,
                    "industry": industry,
                    "description": comp_desc,
                    "logo_url": comp_logo,
                }
                seen_offices.add(office_key)

                accepted_records.append({
                    "row_number": row_num,
                    "company": {
                        "name": comp_name,
                        "slug": comp_slug,
                        "cin": comp_cin or None,
                        "website": comp_website or None,
                        "email": comp_email or None,
                        "phone": comp_phone or None,
                        "industry": industry,
                        "description": comp_desc,
                        "logo_url": comp_logo or None,
                        "is_verified": True,  # Approved via Admin Unified Importer
                    },
                    "office": {
                        "name": office_name or None,
                        "address": office_addr or f"{locality}, {city}",
                        "locality": locality,
                        "city": city,
                        "state": state,
                        "postal_code": pincode or None,
                        "latitude": latitude,
                        "longitude": longitude,
                        "is_headquarters": is_hq,
                    } if (office_addr or locality or latitude) else None,
                    "job": {
                        "title": job_title,
                        "slug": job_slug,
                        "description": job_desc,
                        "skills": skills_list,
                        "experience_min": exp_min,
                        "experience_max": exp_max,
                        "employment_type": emp_type,
                        "work_mode": work_mode,
                        "vacancies": vacancies,
                        "salary_min": sal_min,
                        "salary_max": sal_max,
                        "currency": currency,
                        "application_url": app_url,
                        "job_source_url": job_src_url or None,
                        "posted_at": posted_at_str or None,
                        "expires_at": expires_at_str or None,
                        "status": job_status,
                    } if has_job and not is_dup_job else None,
                })
            else:
                total_rejected += 1

            items.append(ImportPreviewItem(
                row_number=row_num,
                company_name=comp_name or "Unknown",
                company_slug=comp_slug,
                company_cin=comp_cin or None,
                office_name=office_name or None,
                locality=locality,
                job_title=job_title or None,
                job_slug=job_slug or None,
                vacancies=vacancies if has_job else None,
                is_duplicate_company=is_dup_comp,
                is_duplicate_office=is_dup_office,
                is_duplicate_job=is_dup_job,
                valid=is_valid,
                issues=issues,
                warnings=warnings,
            ))

        import json
        serialized = json.dumps(accepted_records)

        # Count new entities
        new_comps = sum(1 for k in seen_companies if not self._company_exists_in_db(k))
        existing_comps = len(seen_companies) - new_comps
        new_offices = len(seen_offices)
        new_jobs = sum(1 for r in accepted_records if r.get("job"))

        return ImportPreviewResponse(
            total_records=len(items),
            accepted_count=total_accepted,
            rejected_count=total_rejected,
            new_companies_count=new_comps,
            existing_companies_count=existing_comps,
            new_offices_count=new_offices,
            new_jobs_count=new_jobs,
            items=items,
            raw_accepted_json=serialized,
        )

    def _company_exists_in_db(self, key: str) -> bool:
        return bool(
            self.db.query(Company)
            .filter(or_(Company.cin == key, Company.slug == key.lower()))
            .first()
        )

    def execute_unified_import(self, accepted_records_json: str) -> ImportConfirmResponse:
        """
        Executes transactional import of accepted records into PostgreSQL.
        Rolls back completely if an unexpected error occurs.
        """
        import json
        records = json.loads(accepted_records_json)

        companies_created = 0
        companies_updated = 0
        offices_created = 0
        offices_updated = 0
        jobs_created = 0
        jobs_updated = 0
        skipped_count = 0

        # Cache company models created/found in this transaction
        company_cache: Dict[str, Company] = {}
        office_cache: Dict[Tuple[int, str], Office] = {}

        try:
            for rec in records:
                c_data = rec["company"]
                cin = c_data.get("cin")
                slug = c_data["slug"].strip().lower()
                c_key = cin.strip().upper() if cin else slug

                company = company_cache.get(c_key)
                if not company:
                    # Check DB
                    if cin:
                        company = self.db.query(Company).filter(Company.cin == cin.strip()).first()
                    if not company:
                        company = self.db.query(Company).filter(Company.slug == slug).first()

                    if not company:
                        # Create Company
                        company = Company(
                            name=c_data["name"].strip(),
                            slug=slug,
                            cin=cin.strip() if cin else None,
                            website=c_data.get("website"),
                            email=c_data.get("email"),
                            phone=c_data.get("phone"),
                            industry=c_data.get("industry") or "Technology",
                            description=c_data.get("description"),
                            logo_url=c_data.get("logo_url"),
                            is_verified=True,  # Approved via Admin Unified Importer
                        )
                        self.db.add(company)
                        self.db.flush()
                        companies_created += 1
                    else:
                        # Existing company - update non-destructive fields and ensure verified
                        company.is_verified = True
                        if c_data.get("email") and not company.email:
                            company.email = c_data["email"]
                        if c_data.get("phone") and not company.phone:
                            company.phone = c_data["phone"]
                        if c_data.get("cin") and not company.cin:
                            company.cin = c_data["cin"]
                        self.db.flush()
                        companies_updated += 1

                    company_cache[c_key] = company

                # Process Office
                office_data = rec.get("office")
                office = None
                if office_data:
                    addr_norm = (office_data.get("address") or office_data.get("locality") or "").strip().lower()
                    off_cache_key = (company.id, addr_norm)

                    office = office_cache.get(off_cache_key)
                    if not office:
                        # Check DB
                        office = (
                            self.db.query(Office)
                            .filter(
                                Office.company_id == company.id,
                                func.lower(Office.address) == addr_norm,
                            )
                            .first()
                        )
                        if not office:
                            office = Office(
                                company_id=company.id,
                                name=office_data.get("name"),
                                address=office_data.get("address"),
                                locality=office_data.get("locality"),
                                city=office_data.get("city") or "Bengaluru",
                                state=office_data.get("state") or "Karnataka",
                                postal_code=office_data.get("postal_code"),
                                latitude=office_data.get("latitude"),
                                longitude=office_data.get("longitude"),
                                is_headquarters=office_data.get("is_headquarters", False),
                            )
                            self.db.add(office)
                            self.db.flush()
                            offices_created += 1
                        else:
                            # Update coordinates if provided
                            if office_data.get("latitude") and not office.latitude:
                                office.latitude = office_data["latitude"]
                                office.longitude = office_data["longitude"]
                                offices_updated += 1

                        office_cache[off_cache_key] = office

                # Process Job
                job_data = rec.get("job")
                if job_data:
                    j_slug = job_data["slug"].strip().lower()
                    existing_job = self.db.query(Job).filter(Job.slug == j_slug).first()

                    if not existing_job:
                        # Parse dates if present
                        posted_at = None
                        if job_data.get("posted_at"):
                            try:
                                posted_at = datetime.fromisoformat(job_data["posted_at"])
                            except Exception:
                                posted_at = datetime.now(timezone.utc)
                        else:
                            posted_at = datetime.now(timezone.utc)

                        expires_at = None
                        if job_data.get("expires_at"):
                            try:
                                expires_at = datetime.fromisoformat(job_data["expires_at"])
                            except Exception:
                                expires_at = None

                        job = Job(
                            company_id=company.id,
                            office_id=office.id if office else None,
                            title=job_data["title"].strip(),
                            slug=j_slug,
                            description=job_data["description"],
                            skills=job_data.get("skills"),
                            experience_min=job_data.get("experience_min"),
                            experience_max=job_data.get("experience_max"),
                            employment_type=job_data.get("employment_type") or "full-time",
                            work_mode=job_data.get("work_mode") or "in-office",
                            vacancies=job_data.get("vacancies", 1),
                            salary_min=job_data.get("salary_min"),
                            salary_max=job_data.get("salary_max"),
                            currency=job_data.get("currency") or "INR",
                            application_url=job_data.get("application_url"),
                            job_source_url=job_data.get("job_source_url"),
                            status=job_data.get("status") or "active",
                            posted_at=posted_at,
                            expires_at=expires_at,
                        )
                        self.db.add(job)
                        self.db.flush()

                        # Add JobSource record
                        source = JobSource(
                            job_id=job.id,
                            source_name="admin_unified_csv",
                            source_url=job_data.get("job_source_url") or job_data.get("application_url"),
                            last_verified_at=datetime.now(timezone.utc),
                        )
                        self.db.add(source)
                        jobs_created += 1
                    else:
                        skipped_count += 1

            self.db.commit()
            return ImportConfirmResponse(
                companies_created=companies_created,
                companies_updated=companies_updated,
                offices_created=offices_created,
                offices_updated=offices_updated,
                jobs_created=jobs_created,
                jobs_updated=jobs_updated,
                skipped_count=skipped_count,
                rejected_count=0,
                message=(
                    f"Unified import executed successfully: {companies_created} companies, "
                    f"{offices_created} offices, and {jobs_created} jobs created."
                ),
            )

        except Exception as exc:
            self.db.rollback()
            raise RuntimeError(f"Database transaction rolled back due to error: {exc}")
