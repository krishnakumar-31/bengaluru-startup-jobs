from typing import Any, Dict, List, Optional
import httpx
from app.pipeline.collectors.base import BaseCollector
from app.pipeline.models import (
    RawCompanyData,
    RawJobData,
    RawOfficeData,
    RawStartupRecord,
)


class BaseHttpCollector(BaseCollector):
    """Base HTTP-based collector for authorized public job board endpoints.

    Strictly adheres to access controls, uses polite request headers,
    and handles timeouts cleanly.
    """

    source_type: str = "api"

    def __init__(
        self,
        timeout_seconds: float = 10.0,
        user_agent: str = "BengaluruStartupJobsMap-Bot/1.0",
    ):
        self.timeout = timeout_seconds
        self.headers = {
            "User-Agent": user_agent,
            "Accept": "application/json",
        }


class GreenhouseBoardCollector(BaseHttpCollector):
    """Collects job listings from an authorized public Greenhouse job board.

    Maps Greenhouse's public JSON schema into canonical RawStartupRecord.
    """

    name: str = "greenhouse_collector"

    def __init__(
        self,
        board_token: str,
        company_metadata: RawCompanyData,
        office_metadata: RawOfficeData,
        timeout_seconds: float = 10.0,
    ):
        super().__init__(timeout_seconds=timeout_seconds)
        self.board_token = board_token
        self.company = company_metadata
        self.office = office_metadata
        self.api_url = f"https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true"

    def collect(self) -> List[RawStartupRecord]:
        try:
            with httpx.Client(timeout=self.timeout, headers=self.headers) as client:
                resp = client.get(self.api_url)
                if resp.status_code == 404:
                    return []
                resp.raise_for_status()
                data = resp.json()
        except Exception:
            return []

        gh_jobs = data.get("jobs", [])
        jobs: List[RawJobData] = []

        for item in gh_jobs:
            location_name = item.get("location", {}).get("name", "")
            # Filter only for Bengaluru / Bangalore locations
            if "bengaluru" in location_name.lower() or "bangalore" in location_name.lower():
                jobs.append(
                    RawJobData(
                        title=item.get("title", ""),
                        description=item.get("content", item.get("title", "")),
                        application_url=item.get("absolute_url", ""),
                        source_name="greenhouse_public_board",
                        source_url=self.api_url,
                        posted_at=item.get("updated_at"),
                    )
                )

        if not jobs:
            return []

        return [
            RawStartupRecord(
                company=self.company,
                offices=[self.office],
                jobs=jobs,
            )
        ]
