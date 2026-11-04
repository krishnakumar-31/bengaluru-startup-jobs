import json
from pathlib import Path
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from app.pipeline.collectors.base import BaseCollector
from app.pipeline.importer.importer import DatabaseImporter
from app.pipeline.models import (
    ImportReport,
    RawStartupRecord,
    RejectedRecord,
    ValidatedStartupRecord,
    ValidationBatch,
)
from app.pipeline.validation.validator import PipelineValidator


class PipelineService:
    """Orchestrator for the Bengaluru Startup Jobs collection and ingestion pipeline.

    Coordinates Collection -> Validation -> Import -> Reporting.
    """

    def __init__(
        self,
        db: Session,
        validator: Optional[PipelineValidator] = None,
        importer: Optional[DatabaseImporter] = None,
    ):
        self.db = db
        self.validator = validator or PipelineValidator()
        self.importer = importer or DatabaseImporter(db)

    def collect(self, collector: BaseCollector) -> List[RawStartupRecord]:
        """Collect raw startup and job records from a configured collector."""
        return collector.collect()

    def validate(
        self, raw_records: List[RawStartupRecord]
    ) -> ValidationBatch:
        """Validate raw records against Bengaluru municipal boundaries and job schemas."""
        return self.validator.validate_batch(raw_records)

    def import_records(
        self,
        validated_records: List[ValidatedStartupRecord],
        dry_run: bool = False,
    ) -> ImportReport:
        """Ingest validated records into PostgreSQL."""
        return self.importer.import_batch(validated_records, dry_run=dry_run)

    def run_pipeline(
        self,
        collector: BaseCollector,
        dry_run: bool = False,
        quarantine_path: Optional[Path] = None,
    ) -> Tuple[ValidationBatch, ImportReport]:
        """Execute the end-to-end pipeline: Collection -> Validation -> Quarantine -> Import."""
        raw_records = self.collect(collector)
        batch = self.validate(raw_records)

        # Save quarantined/unverified records if requested
        if quarantine_path and batch.rejected:
            self.save_quarantine_report(batch.rejected, quarantine_path)

        # Import only verified accepted records
        report = self.import_records(batch.accepted, dry_run=dry_run)
        return batch, report

    @staticmethod
    def save_quarantine_report(
        rejected: List[RejectedRecord], output_path: Path
    ) -> None:
        """Persist rejected/unverified records separately for auditing and remediation."""
        output_path.parent.mkdir(parents=True, exist_ok=True)
        serializable = [r.model_dump(mode="json") for r in rejected]
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(serializable, f, indent=2, default=str)
