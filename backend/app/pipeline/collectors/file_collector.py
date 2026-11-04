import json
from pathlib import Path
from typing import Any, Dict, List, Union
import yaml
from app.pipeline.collectors.base import BaseCollector
from app.pipeline.models import (
    RawCompanyData,
    RawJobData,
    RawOfficeData,
    RawStartupRecord,
)


class FileCollector(BaseCollector):
    """Loads startup and job records from local JSON or YAML source files or directory."""

    name: str = "file_collector"
    source_type: str = "file"

    def __init__(self, file_path: Union[str, Path]):
        self.path = Path(file_path)

    def collect(self) -> List[RawStartupRecord]:
        if not self.path.exists():
            raise FileNotFoundError(f"Source file not found: {self.path}")

        if self.path.is_dir():
            records: List[RawStartupRecord] = []
            for ext in ("*.json", "*.yaml", "*.yml"):
                for p in self.path.glob(ext):
                    records.extend(self._read_file(p))
            return records

        return self._read_file(self.path)

    def _read_file(self, file_path: Path) -> List[RawStartupRecord]:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        if file_path.suffix.lower() == ".json":
            data = json.loads(content)
        elif file_path.suffix.lower() in (".yaml", ".yml"):
            data = yaml.safe_load(content)
        else:
            raise ValueError(f"Unsupported file format: {file_path.suffix}. Expected .json or .yaml")

        if isinstance(data, dict):
            # Check if wrapped in a top-level key like "startups" or "companies"
            if "startups" in data and isinstance(data["startups"], list):
                raw_items = data["startups"]
            elif "companies" in data and isinstance(data["companies"], list):
                raw_items = data["companies"]
            else:
                raw_items = [data]
        elif isinstance(data, list):
            raw_items = data
        else:
            return []

        return [self._parse_raw_item(item) for item in raw_items if isinstance(item, dict)]

    def _parse_raw_item(self, item: Dict[str, Any]) -> RawStartupRecord:
        # 1. Company
        comp_dict = item.get("company", {})
        if not comp_dict and "name" in item:
            # Flat company representation
            comp_dict = item

        company = RawCompanyData(
            name=comp_dict.get("name", ""),
            slug=comp_dict.get("slug"),
            description=comp_dict.get("description"),
            website=comp_dict.get("website") or comp_dict.get("website_url", ""),
            logo_url=comp_dict.get("logo_url"),
            industry=comp_dict.get("industry"),
            company_size=comp_dict.get("company_size"),
            founded_year=comp_dict.get("founded_year"),
            is_verified=comp_dict.get("is_verified", True),
        )

        # 2. Offices
        offices: List[RawOfficeData] = []
        offices_data = item.get("offices")
        if offices_data and isinstance(offices_data, list):
            for off in offices_data:
                if isinstance(off, dict):
                    offices.append(RawOfficeData(**off))
        elif "office" in item and isinstance(item["office"], dict):
            offices.append(RawOfficeData(**item["office"]))
        elif "locality" in comp_dict or "address" in comp_dict:
            # Fallback if office fields are in company dict
            offices.append(
                RawOfficeData(
                    address=comp_dict.get("address"),
                    locality=comp_dict.get("locality", "Bengaluru"),
                    city=comp_dict.get("city", "Bengaluru"),
                    state=comp_dict.get("state", "Karnataka"),
                    postal_code=comp_dict.get("postal_code"),
                    latitude=comp_dict.get("latitude"),
                    longitude=comp_dict.get("longitude"),
                )
            )

        # 3. Jobs
        jobs: List[RawJobData] = []
        jobs_data = item.get("jobs", [])
        if isinstance(jobs_data, list):
            for jb in jobs_data:
                if isinstance(jb, dict):
                    jobs.append(RawJobData(**jb))

        return RawStartupRecord(
            company=company,
            offices=offices,
            jobs=jobs,
        )
