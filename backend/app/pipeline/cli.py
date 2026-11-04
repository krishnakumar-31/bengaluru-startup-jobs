import argparse
import sys
from pathlib import Path
from app.db.session import SessionLocal
from app.pipeline.collectors.file_collector import FileCollector
from app.pipeline.service import PipelineService


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Bengaluru Startup Jobs Map - Data Collection & Ingestion Pipeline"
    )
    parser.add_argument(
        "--source",
        type=str,
        default=None,
        help="Path to source file (.json or .yaml) or directory. Defaults to data/sources/verified_bengaluru_startups.json",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Perform collection, validation, and database test in a transaction that is rolled back.",
    )
    parser.add_argument(
        "--validate-only",
        action="store_true",
        help="Perform collection and validation only; skip database import.",
    )
    parser.add_argument(
        "--quarantine-output",
        type=str,
        default=None,
        help="Path to output file for rejected unverified records. Defaults to data/reports/quarantined_records.json",
    )

    args = parser.parse_args()

    # Determine project root and default source path
    # backend/app/pipeline/cli.py -> backend root -> project root
    backend_root = Path(__file__).resolve().parent.parent.parent
    project_root = backend_root.parent

    source_path = (
        Path(args.source)
        if args.source
        else project_root / "data" / "sources" / "verified_bengaluru_startups.json"
    )

    if not source_path.exists():
        print(f"[ERROR] Source path does not exist: {source_path}")
        return 1

    quarantine_path = (
        Path(args.quarantine_output)
        if args.quarantine_output
        else project_root / "data" / "reports" / "quarantined_records.json"
    )

    print("======================================================================")
    print(" Bengaluru Startup Jobs Map - Data Pipeline")
    print("======================================================================")
    print(f" Source:      {source_path}")
    print(f" Mode:        {'DRY-RUN' if args.dry_run else 'VALIDATE-ONLY' if args.validate_only else 'PRODUCTION IMPORT'}")
    print("----------------------------------------------------------------------")

    collector = FileCollector(source_path)
    db = SessionLocal()

    try:
        service = PipelineService(db)

        print("[1/3] Collecting records...")
        raw_records = service.collect(collector)
        print(f"      Collected {len(raw_records)} raw startup profiles.")

        print("[2/3] Validating records...")
        batch = service.validate(raw_records)
        print(f"      Accepted: {len(batch.accepted)} records verified.")
        print(f"      Rejected: {len(batch.rejected)} unverified/invalid records.")

        if batch.rejected:
            service.save_quarantine_report(batch.rejected, quarantine_path)
            print(f"      Quarantined unverified records saved to: {quarantine_path}")
            for r in batch.rejected:
                print(f"       - {r.company_name or 'Unknown'}: {len(r.issues)} issue(s)")
                for issue in r.issues:
                    print(f"           [{issue.severity.upper()}] {issue.field}: {issue.message}")

        if args.validate_only:
            print("\nValidation complete. Skipping database import as requested (--validate-only).")
            return 0 if batch.is_valid else 2

        print(f"[3/3] Ingesting {len(batch.accepted)} verified records into PostgreSQL...")
        report = service.import_records(batch.accepted, dry_run=args.dry_run)

        print("----------------------------------------------------------------------")
        print(" Import Summary Report:")
        print(f"   Companies Created: {report.companies_created}")
        print(f"   Companies Updated: {report.companies_updated}")
        print(f"   Offices Created:   {report.offices_created}")
        print(f"   Offices Updated:   {report.offices_updated}")
        print(f"   Jobs Created:      {report.jobs_created}")
        print(f"   Jobs Updated:      {report.jobs_updated}")
        print(f"   Sources Created:   {report.sources_created}")
        print(f"   Sources Updated:   {report.sources_updated}")
        print(f"   Execution Time:    {report.duration_ms} ms")

        if report.errors:
            print("\n[ERRORS]")
            for err in report.errors:
                print(f"   - {err}")
            return 1

        print("======================================================================")
        print(" Pipeline execution finished successfully!")
        return 0

    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
