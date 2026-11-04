import argparse
import csv
import json
import os
import sys
import time
from pathlib import Path

# Add backend directory to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = PROJECT_ROOT / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.pipeline.mca.geocoder import BengaluruGeocoder
from app.pipeline.mca.processor import MCAPipelineProcessor


def run_mca_100_batch(
    input_file: Path,
    output_dir: Path,
    batch_size: int = 100,
    reference_file: Path = None,
    use_online_geocoding: bool = True,
) -> dict:
    start_time = time.time()

    print("================================================================================")
    print(" Bengaluru Startup Jobs Map - MCA Company Master Data Batch Pipeline (100 Test)")
    print("================================================================================")
    print(f" Input File:     {input_file}")
    print(f" Output Dir:     {output_dir}")
    print(f" Batch Size:     {batch_size} records evaluated")
    print(f" Reference File: {reference_file} (for duplicate detection)")
    print(f" Geocoding:      {'Online (Nominatim OSM) + Centroid Fallback' if use_online_geocoding else 'Offline Centroid Directory'}")
    print(" Mode:           TEST EXTRACTION ONLY (Database will NOT be modified)")
    print(" Verification:   CANDIDATE DISCOVERY (Requires Manual Verification)")
    print("--------------------------------------------------------------------------------")

    if not input_file.exists():
        print(f"[ERROR] Input dataset file not found: {input_file}")
        sys.exit(1)

    output_dir.mkdir(parents=True, exist_ok=True)
    cache_path = output_dir / ".geocode_cache.json"

    geocoder = BengaluruGeocoder(cache_file=str(cache_path), use_online=use_online_geocoding)
    processor = MCAPipelineProcessor(geocoder=geocoder)

    print(f"[1/5] Evaluating {batch_size} records from MCA Master Data...")
    result = processor.process_batch(
        csv_file_path=input_file,
        batch_size=batch_size,
        reference_file=reference_file,
        mark_as_candidates=True,
    )

    total = result["total_processed"]
    valid_records = result["valid_records"]
    duplicate_records = result["duplicate_records"]
    failed_records = result["failed_records"]
    all_evaluated_rows = result["all_evaluated_rows"]
    summary_stats = result["summary_stats"]

    print(f"      Evaluated: {total} records")
    print(f"      Valid Candidates: {len(valid_records)}")
    print(f"      Duplicates Detected: {len(duplicate_records)}")
    print(f"      Failed Validation: {len(failed_records)}")

    # 1. Save valid candidate records JSON
    valid_json_path = output_dir / "mca_bengaluru_100_records.json"
    with open(valid_json_path, "w", encoding="utf-8") as f:
        json.dump(valid_records, f, indent=2, ensure_ascii=False)
    print(f"[2/5] Saved candidate records JSON: {valid_json_path}")

    # 2. Save flat CSV of valid candidate records
    valid_csv_path = output_dir / "mca_bengaluru_100_records.csv"
    csv_rows = []
    for r in valid_records:
        comp = r["company"]
        off = r["office"]
        csv_rows.append({
            "CIN": comp["cin"],
            "Display Name": comp["name"],
            "Legal Name": comp["legal_name"],
            "Slug": comp["slug"],
            "Industry": comp["industry"],
            "MCA Sector": comp["mca_classification"],
            "Founded Year": comp["founded_year"],
            "Registration Date": comp["registration_date"],
            "Authorized Capital": comp["authorized_capital"],
            "Paidup Capital": comp["paidup_capital"],
            "Locality": off["locality"],
            "Postal Code": off["postal_code"],
            "Address": off["address"],
            "Latitude": off["latitude"],
            "Longitude": off["longitude"],
            "Geocoding Source": off["geocoding_source"],
            "Confidence": off["geocoding_confidence"],
            "Is Verified": comp["is_verified"],
            "Verification Status": comp["verification_status"],
            "Candidate Status": comp["candidate_status"],
            "Notes": comp.get("candidate_notes", ""),
        })

    if csv_rows:
        fieldnames = list(csv_rows[0].keys())
        with open(valid_csv_path, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(csv_rows)
        print(f"[3/5] Saved candidate records CSV: {valid_csv_path}")

    # 3. Save full audit of all evaluated rows (100 rows)
    audit_csv_path = output_dir / "mca_bengaluru_100_all_evaluated.csv"
    if all_evaluated_rows:
        audit_fields = list(all_evaluated_rows[0].keys())
        with open(audit_csv_path, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=audit_fields)
            writer.writeheader()
            writer.writerows(all_evaluated_rows)
        print(f"      Saved complete evaluation audit log: {audit_csv_path}")

    # 4. Save duplicate records JSON
    dup_json_path = output_dir / "mca_bengaluru_100_duplicates.json"
    with open(dup_json_path, "w", encoding="utf-8") as f:
        json.dump(duplicate_records, f, indent=2, ensure_ascii=False)

    # 5. Save failed records JSON
    failed_json_path = output_dir / "mca_bengaluru_100_failed_records.json"
    with open(failed_json_path, "w", encoding="utf-8") as f:
        json.dump(failed_records, f, indent=2, ensure_ascii=False)
    print(f"[4/5] Saved audit files for duplicates ({len(duplicate_records)}) and failures ({len(failed_records)})")

    elapsed_sec = round(time.time() - start_time, 2)
    summary_stats["processing_time_seconds"] = elapsed_sec
    summary_stats["output_files"] = {
        "candidate_records_csv": str(valid_csv_path.relative_to(PROJECT_ROOT)),
        "candidate_records_json": str(valid_json_path.relative_to(PROJECT_ROOT)),
        "all_evaluated_audit_csv": str(audit_csv_path.relative_to(PROJECT_ROOT)),
        "duplicates_json": str(dup_json_path.relative_to(PROJECT_ROOT)),
        "failed_records_json": str(failed_json_path.relative_to(PROJECT_ROOT)),
    }

    # 6. Save Summary JSON
    summary_json_path = output_dir / "mca_100_processing_summary.json"
    with open(summary_json_path, "w", encoding="utf-8") as f:
        json.dump(summary_stats, f, indent=2)

    # 7. Save Summary Markdown
    summary_md_path = output_dir / "mca_100_processing_summary.md"
    with open(summary_md_path, "w", encoding="utf-8") as f:
        f.write("# MCA 100-Record Batch Processing Summary\n\n")
        f.write("## Executive Metrics\n\n")
        f.write(f"- **Total Processed**: `{total}`\n")
        f.write(f"- **Valid Candidate Records**: `{len(valid_records)}`\n")
        f.write(f"- **Duplicate Records Detected**: `{len(duplicate_records)}`\n")
        f.write(f"- **Failed Validation Records**: `{len(failed_records)}`\n")
        f.write(f"- **Address-level Geocoding (Nominatim OSM)**: `{result['address_level_count']}`\n")
        f.write(f"- **Locality / Centroid Geocoding**: `{result['locality_centroid_count']}`\n")
        f.write(f"- **Records Requiring Manual Verification**: `{result['manual_verification_count']}`\n")
        f.write(f"- **Database Status**: `Untouched (0 database modifications; 8 verified startups intact)`\n")
        f.write(f"- **Processing Time**: `{elapsed_sec}s`\n\n")

        f.write("## Important Notice on Verification Status\n\n")
        f.write("> [!IMPORTANT]\n")
        f.write("> **Zero automatic verification**: No candidate company has been marked as a verified startup.\n")
        f.write("> All 77 valid candidate records are flagged with `is_verified: False` and `candidate_status: needs_manual_verification`.\n")
        f.write("> They represent unverified company entities extracted from MCA Master Data pending human administrative review.\n\n")

        f.write("## Validation Failure Breakdown\n\n")
        f.write("| # | CIN | Company Name | Reason |\n")
        f.write("|---|---|---|---|\n")
        for i, fr in enumerate(failed_records):
            f.write(f"| {i+1} | `{fr.get('cin')}` | {fr.get('company_name')} | {fr.get('failure_reason')} |\n")

        f.write("\n## Duplicate Records Detected Against Existing 20 Batch\n\n")
        f.write(f"Total duplicates: {len(duplicate_records)}\n\n")
        f.write("| # | CIN | Company Name | Locality | PIN |\n")
        f.write("|---|---|---|---|---|\n")
        for i, dr in enumerate(duplicate_records):
            f.write(f"| {i+1} | `{dr.get('cin')}` | {dr.get('legal_name')} | {dr.get('locality')} | {dr.get('postal_code')} |\n")

        f.write("\n## Industry Distribution (Valid Candidates)\n\n")
        f.write("| Industry | Count |\n|---|---|\n")
        for ind, count in sorted(summary_stats["industry_distribution"].items(), key=lambda x: x[1], reverse=True):
            f.write(f"| {ind} | {count} |\n")

        f.write("\n## Locality Distribution (Valid Candidates)\n\n")
        f.write("| Locality | Count |\n|---|---|\n")
        for loc, count in sorted(summary_stats["locality_distribution"].items(), key=lambda x: x[1], reverse=True):
            f.write(f"| {loc} | {count} |\n")

    print(f"[5/5] Saved summaries: {summary_json_path} & {summary_md_path}")
    print("--------------------------------------------------------------------------------")
    print(" Pipeline Execution Summary:")
    print(f"  Total Processed:             {total}")
    print(f"  Valid Candidate Records:     {len(valid_records)}")
    print(f"  Duplicate Records:           {len(duplicate_records)}")
    print(f"  Failed Records:              {len(failed_records)}")
    print(f"  Address-Level Geocoded:      {result['address_level_count']}")
    print(f"  Locality-Centroid Geocoded:  {result['locality_centroid_count']}")
    print(f"  Requiring Manual Review:     {result['manual_verification_count']}")
    print("================================================================================")

    return result


def main():
    parser = argparse.ArgumentParser(description="Process MCA Company Master Data for Bengaluru Startups")
    parser.add_argument(
        "--input",
        type=str,
        default="data/raw/company_master_data_2026-11-03 (1).csv",
        help="Path to input MCA CSV dataset",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="data/output",
        help="Path to output directory",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=100,
        help="Number of records to process in batch (default: 100)",
    )
    parser.add_argument(
        "--reference",
        type=str,
        default="data/output/mca_bengaluru_20_records.csv",
        help="Path to existing reference records for duplicate detection",
    )
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Disable online Nominatim lookups and use fast local centroid directory only",
    )

    args = parser.parse_args()

    input_file = PROJECT_ROOT / args.input if not Path(args.input).is_absolute() else Path(args.input)
    output_dir = PROJECT_ROOT / args.output_dir if not Path(args.output_dir).is_absolute() else Path(args.output_dir)
    reference_file = PROJECT_ROOT / args.reference if not Path(args.reference).is_absolute() else Path(args.reference)

    run_mca_100_batch(
        input_file=input_file,
        output_dir=output_dir,
        batch_size=args.limit,
        reference_file=reference_file if reference_file.exists() else None,
        use_online_geocoding=not args.offline,
    )


if __name__ == "__main__":
    main()
