import json
import pytest
from pathlib import Path
from unittest.mock import MagicMock, patch
from app.pipeline.collectors.file_collector import FileCollector
from app.pipeline.collectors.api_collector import GreenhouseBoardCollector
from app.pipeline.models import RawCompanyData, RawOfficeData


def test_file_collector_json(tmp_path):
    sample_file = tmp_path / "sample.json"
    data = [
        {
            "company": {
                "name": "File Startup",
                "slug": "file-startup",
                "website": "https://filestartup.in",
                "description": "Collected from file.",
                "industry": "FinTech",
            },
            "offices": [
                {
                    "address": "Koramangala 4th Block",
                    "locality": "Koramangala",
                    "city": "Bengaluru",
                    "state": "Karnataka",
                    "postal_code": "560034",
                    "latitude": 12.9352,
                    "longitude": 77.6245,
                }
            ],
            "jobs": [
                {
                    "title": "Software Engineer",
                    "description": "Build backend apps.",
                    "application_url": "https://filestartup.in/jobs/se",
                    "source_name": "careers",
                    "source_url": "https://filestartup.in/careers",
                }
            ],
        }
    ]
    sample_file.write_text(json.dumps(data), encoding="utf-8")

    collector = FileCollector(sample_file)
    records = collector.collect()
    assert len(records) == 1
    assert records[0].company.name == "File Startup"
    assert len(records[0].offices) == 1
    assert len(records[0].jobs) == 1


def test_file_collector_missing_file():
    collector = FileCollector(Path("non_existent_file.json"))
    with pytest.raises(FileNotFoundError):
        collector.collect()


def test_file_collector_unsupported_format(tmp_path):
    bad_file = tmp_path / "data.txt"
    bad_file.write_text("plain text", encoding="utf-8")
    collector = FileCollector(bad_file)
    with pytest.raises(ValueError, match="Unsupported file format"):
        collector.collect()


def test_greenhouse_collector_mocking():
    comp = RawCompanyData(
        name="GH Tech",
        website="https://ghtech.com",
        description="Greenhouse user.",
        industry="SaaS",
    )
    office = RawOfficeData(
        address="Indiranagar",
        locality="Indiranagar",
        postal_code="560038",
        latitude=12.9719,
        longitude=77.6412,
    )

    collector = GreenhouseBoardCollector(
        board_token="ghtech",
        company_metadata=comp,
        office_metadata=office,
    )

    mock_response = {
        "jobs": [
            {
                "id": 12345,
                "title": "Bengaluru Backend Engineer",
                "content": "Work on distributed systems in Bengaluru office.",
                "absolute_url": "https://boards.greenhouse.io/ghtech/jobs/12345",
                "location": {"name": "Bengaluru, India"},
                "updated_at": "2026-10-25T12:00:00Z",
            },
            {
                "id": 12346,
                "title": "US Remote Engineer",
                "content": "US Remote only.",
                "absolute_url": "https://boards.greenhouse.io/ghtech/jobs/12346",
                "location": {"name": "San Francisco, CA"},
                "updated_at": "2026-10-25T12:00:00Z",
            },
        ]
    }

    with patch("httpx.Client.get") as mock_get:
        mock_resp_obj = MagicMock()
        mock_resp_obj.status_code = 200
        mock_resp_obj.json.return_value = mock_response
        mock_get.return_value = mock_resp_obj

        records = collector.collect()
        assert len(records) == 1
        # Only the Bengaluru role should be collected
        assert len(records[0].jobs) == 1
        assert records[0].jobs[0].title == "Bengaluru Backend Engineer"
        assert records[0].jobs[0].source_name == "greenhouse_public_board"
