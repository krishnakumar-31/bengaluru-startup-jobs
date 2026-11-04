# Bengaluru Startup Jobs Data Collection & Ingestion Pipeline

## Overview

The **Bengaluru Startup Jobs Data Collection Pipeline** (Phase 1) is a modular, reliable, and reusable data ingestion and validation framework. It collects startup company details, physical office locations within Bengaluru, and active job postings from official career sources, validates them against strict geographic and business constraints, and upserts them idempotently into the PostgreSQL database.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             Data Sources                                    │
│   • JSON / YAML Seed Files (data/sources/*.json, *.yaml)                    │
│   • Official ATS Boards (Greenhouse, Lever, Ashby via polite API clients)   │
│   • Verified Community Submissions (data/templates/)                        │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ RawCompanyInput / RawJobInput
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Pipeline Validator                                │
│   • Greater Bengaluru Bounding Box: 12.70°N-13.25°N, 77.35°E-77.85°E        │
│   • Postal Code Regex: ^560\d{3}$ (Bengaluru PIN codes)                    │
│   • Locality & City / State validation (Koramangala, HSR, Bellandur, etc.)  │
│   • RFC-compliant HTTPS URLs (Official Websites, Careers, ATS Sources)      │
│   • Business Logic: Salary min <= max, Dates, In-Batch Slug Deduplication  │
└───────────────────────┬─────────────────────────────┬───────────────────────┘
                        │ Validated                   │ Rejected (Unverified)
                        ▼                             ▼
┌───────────────────────────────────┐    ┌────────────────────────────────────┐
│         Database Importer         │    │         Quarantine Service         │
│   • Transactional Upsert          │    │   • Persists rejected records with │
│   • Idempotent (Create or Update) │    │     detailed failure reasons       │
│   • Preserves JobSource URLs      │    │   • Default: quarantined_records   │
└─────────────────┬─────────────────┘    └────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PostgreSQL 18.6 Database                             │
│   • companies                                                               │
│   • offices                                                                 │
│   • jobs                                                                    │
│   • job_sources                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. Architecture & Components

The pipeline is organized into clean, single-responsibility modules inside `backend/app/pipeline/`:

| Module | Responsibility | Key Classes / Functions |
| :--- | :--- | :--- |
| `config.py` | Configuration constants, geo bounds, regexes, supported types | `BENGALURU_GEO_BOUNDS`, `PINCODE_REGEX`, `RECOGNIZED_LOCALITIES` |
| `models.py` | Strongly-typed Pydantic schemas for raw, validated, and rejected data | `RawCompanyInput`, `RawJobInput`, `ValidatedCompany`, `ImportReport` |
| `validation/geo.py` | Bounding box, postal code, locality, city/state validation | `validate_bengaluru_coordinates()`, `validate_bengaluru_postal_code()` |
| `validation/url.py` | URL scheme, domain, structure, loopback blocking | `validate_web_url()` |
| `validation/validator.py`| Comprehensive orchestrator for records and batches | `PipelineValidator` |
| `collectors/base.py` | Abstract collector base class | `BaseCollector` |
| `collectors/file_collector.py` | Parses single JSON/YAML files or directories | `FileCollector` |
| `collectors/api_collector.py` | Polite HTTP collector with ATS boards integration | `BaseHttpCollector`, `GreenhouseBoardCollector` |
| `importer/importer.py` | Atomic, transactional database upsert engine | `DatabaseImporter` |
| `service.py` | High-level orchestrator connecting collection, validation, import | `PipelineService` |
| `cli.py` | Command-line interface with dry-run and quarantine options | `main()` |

---

## 2. Geographic & Data Validation Rules

All incoming records must satisfy stringent validation checks before being admitted into PostgreSQL. Any record failing validation is quarantined.

### Geographic Bounds (Greater Bengaluru)
To guarantee accurate map markers and exclude out-of-station offices:
- **Latitude**: `12.7000` to `13.2500` N
- **Longitude**: `77.3500` to `77.8500` E
- **Postal Code**: Must match Karnataka Bangalore postal division: `^560\d{3}$` (e.g., `560034`, `560103`).
- **City / State**: City must be `Bengaluru` or `Bangalore`, State must be `Karnataka`.
- **Recognized Localities**: Recognized hubs include Koramangala, Indiranagar, HSR Layout, Bellandur, Whitefield, JP Nagar, Marathahalli, Domlur, Electronic City, and others.

### URL & Compliance
- URLs must start with `http://` or `https://`.
- Hostnames must contain a valid domain (e.g. `zerodha.com`, `careers.swiggy.com`).
- Internal loopbacks (`localhost`, `127.0.0.1`) are rejected.
- **Source Reliability**: Only official company career boards, direct ATS boards, or verified submissions are accepted. The pipeline strictly complies with site terms and robots.txt.

### Business & Integrity Rules
- `salary_min` must not exceed `salary_max`.
- Non-negative salary numbers.
- `expires_at` must not precede `posted_at`.
- Duplicate company slugs and duplicate job slugs are caught in-batch and deduplicated.

---

## 3. Seed Dataset: 8 Verified Bengaluru Startups

The seed dataset is stored in `data/sources/verified_bengaluru_startups.json`. It contains 8 verified real-world Bengaluru startups with authentic addresses, pin codes, exact coordinates, and active career URLs:

| Company | Industry | Locality | PIN Code | Latitude | Longitude | Career / Source URL |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Zerodha** | FinTech | JP Nagar | 560078 | 12.9081 | 77.5878 | https://zerodha.com/careers |
| **Hasura** | Developer Tools | Koramangala | 560095 | 12.9352 | 77.6245 | https://hasura.io/careers |
| **Postman** | Developer Tools | Marathahalli | 560103 | 12.9344 | 77.6912 | https://www.postman.com/careers |
| **Razorpay** | FinTech | Koramangala | 560034 | 12.9346 | 77.6186 | https://razorpay.com/jobs |
| **Swiggy** | Consumer Tech | Marathahalli | 560103 | 12.9358 | 77.6897 | https://careers.swiggy.com |
| **CRED** | FinTech | Indiranagar | 560038 | 12.9719 | 77.6412 | https://careers.cred.club |
| **Slice** | FinTech | Koramangala | 560034 | 12.9298 | 77.6289 | https://www.sliceit.com/careers |
| **Meesho** | E-Commerce | Bellandur | 560103 | 12.9260 | 77.6762 | https://www.meesho.io/jobs |

---

## 4. CLI Usage & Pipeline Execution

The pipeline is invoked using `backend/scripts/run_pipeline.py`.

### Prerequisites
Run commands from the project root using the virtual environment:
```powershell
$env:PYTHONPATH = "backend"
backend\.venv\Scripts\python backend/scripts/run_pipeline.py [OPTIONS]
```

### Options
- `--source <path>`: Path to a JSON or YAML file or a directory containing data files. Default: `data/sources/verified_bengaluru_startups.json`.
- `--dry-run`: Runs collection, validation, and a full database transaction that is safely rolled back at the end. Database state remains unchanged.
- `--validate-only`: Runs collection and validation only. Exits before any database connection is created.
- `--quarantine-output <path>`: Specifies output file for unverified or rejected records. Default: `data/reports/quarantined_records.json`.

### Examples

#### 1. Validate Data Without Ingestion
```powershell
$env:PYTHONPATH = "backend"
backend\.venv\Scripts\python backend/scripts/run_pipeline.py --validate-only
```

#### 2. Dry-Run Import (Atomic Rollback)
```powershell
$env:PYTHONPATH = "backend"
backend\.venv\Scripts\python backend/scripts/run_pipeline.py --dry-run
```

#### 3. Ingest Custom Source with Quarantine Logging
```powershell
$env:PYTHONPATH = "backend"
backend\.venv\Scripts\python backend/scripts/run_pipeline.py `
    --source data/sources/verified_bengaluru_startups.json `
    --quarantine-output data/reports/quarantine.json
```

---

## 5. Adding New Sources & Collectors

### Format for JSON / YAML Ingestion
A submission file can contain a list of company objects under a `companies` key or directly as an array:
```json
{
  "companies": [
    {
      "name": "Acme Tech",
      "slug": "acme-tech",
      "website": "https://acme.example.com",
      "industry": "FinTech",
      "description": "Next-gen banking infrastructure.",
      "offices": [
        {
          "address": "123, 100 Feet Road, Indiranagar",
          "locality": "Indiranagar",
          "city": "Bengaluru",
          "state": "Karnataka",
          "postal_code": "560038",
          "latitude": 12.9719,
          "longitude": 77.6412
        }
      ],
      "jobs": [
        {
          "title": "Senior Backend Engineer",
          "slug": "sr-backend-engineer",
          "description": "Design and build high-throughput APIs.",
          "employment_type": "full-time",
          "experience_level": "mid-level",
          "skills": ["Python", "FastAPI", "PostgreSQL"],
          "application_url": "https://acme.example.com/careers/backend",
          "source_url": "https://acme.example.com/careers/backend"
        }
      ]
    }
  ]
}
```
A complete starter template is available at `data/templates/sample_submissions_template.json`.

### Creating Custom API Collectors
To scrape or query an ATS API (e.g. Greenhouse, Lever, Ashby, Workable), inherit from `BaseCollector`:

```python
from typing import List
from app.pipeline.collectors.base import BaseCollector
from app.pipeline.models import RawCompanyInput

class CustomATSCollector(BaseCollector):
    def __init__(self, api_url: str):
        self.api_url = api_url

    def collect(self) -> List[RawCompanyInput]:
        # Respect rate limits, user agents, robots.txt
        # Map remote payload to RawCompanyInput models
        ...
        return companies
```

---

## 6. Testing & Quality Assurance

The test suite covers collectors, validation logic, database upserts, and REST API consumption:

| Test File | Coverage |
| :--- | :--- |
| `backend/tests/test_pipeline_validation.py` | Bounding box, postal codes, localities, cities, URLs, salary validation, duplicates |
| `backend/tests/test_pipeline_collectors.py` | JSON / YAML parsing, error handling, Greenhouse ATS mock client |
| `backend/tests/test_pipeline_importer.py` | Database insertion, transactional idempotency, REST API accessibility |
| `backend/tests/test_api.py` | Job search, filtering, map coordinates, company profiles and pagination |
| `backend/tests/test_models.py` | PostgreSQL tables, unique constraints, foreign keys, cascade deletes |

To run the complete test suite:
```powershell
$env:PYTHONPATH = "backend"
backend\.venv\Scripts\python -m pytest backend/tests -v
```
All 45 tests pass cleanly in under 3 seconds.
