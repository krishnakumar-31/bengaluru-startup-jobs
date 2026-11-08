"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  RefreshCw,
  ShieldCheck,
  Download,
  FileSpreadsheet,
  Layers,
  Building2,
  MapPin,
  Briefcase,
  X,
} from "lucide-react";
import {
  adminPreviewImport,
  adminConfirmImport,
  adminDownloadImportTemplate,
} from "@/lib/admin-api";
import { ImportPreviewResponse, ImportConfirmResponse } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminImportsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<ImportConfirmResponse | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const handleDownloadTemplate = () => {
    adminDownloadImportTemplate();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPreviewData(null);
      setPreviewError(null);
      setConfirmResult(null);
      setConfirmError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setPreviewData(null);
      setPreviewError(null);
      setConfirmResult(null);
      setConfirmError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const runPreview = async () => {
    if (!file) return;

    try {
      setPreviewLoading(true);
      setPreviewError(null);
      setConfirmResult(null);
      const res = await adminPreviewImport(file);
      setPreviewData(res);
    } catch (err: unknown) {
      setPreviewError(err instanceof Error ? err.message : "Failed to parse and preview import file");
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleOpenConfirmModal = () => {
    if (!previewData || previewData.accepted_count === 0) return;
    setIsConfirmModalOpen(true);
  };

  const runConfirm = async () => {
    if (!previewData?.raw_accepted_json) return;

    try {
      setConfirming(true);
      setConfirmError(null);
      const res = await adminConfirmImport(previewData.raw_accepted_json);
      setConfirmResult(res);
      setIsConfirmModalOpen(false);
    } catch (err: unknown) {
      setConfirmError(err instanceof Error ? err.message : "Failed to ingest accepted records");
    } finally {
      setConfirming(false);
    }
  };

  // CSV formula injection protection: escape values starting with =, +, -, @
  const sanitizeCsvValue = (val: string): string => {
    if (!val) return '""';
    let clean = String(val);
    if (/^[=+\-@]/.test(clean)) {
      clean = `'${clean}`;
    }
    return `"${clean.replace(/"/g, '""')}"`;
  };

  const downloadInvalidRowsReport = () => {
    if (!previewData) return;
    const invalidItems = previewData.items.filter((item) => !item.valid);
    if (invalidItems.length === 0) {
      alert("No invalid rows to export.");
      return;
    }

    const headers = ["Row Number", "Company Name", "Locality", "Job Title", "Validation Issues"];
    const rows = invalidItems.map((item) => [
      sanitizeCsvValue(String(item.row_number ?? "")),
      sanitizeCsvValue(item.company_name || ""),
      sanitizeCsvValue(item.locality || ""),
      sanitizeCsvValue(item.job_title || ""),
      sanitizeCsvValue(item.issues.join("; ")),
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `import_invalid_rows_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const resetAll = () => {
    setFile(null);
    setPreviewData(null);
    setPreviewError(null);
    setConfirmResult(null);
    setConfirmError(null);
    setIsConfirmModalOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <UploadCloud className="h-6 w-6 text-indigo-400" />
              Unified CSV Data Ingestion
            </h2>
            <Badge variant="indigo" size="sm">
              Schema v2.0
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Import bulk Bengaluru startups, physical offices, and active job vacancies using the standard 35-column schema.
          </p>
        </div>

        <Button
          onClick={handleDownloadTemplate}
          variant="secondary"
          size="sm"
          icon={<Download className="h-4 w-4 text-indigo-400" />}
          className="self-start sm:self-auto"
        >
          Download Standard Template (.csv)
        </Button>
      </div>

      {/* Confirmation Success Banner */}
      {confirmResult && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 space-y-4 shadow-xl">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-emerald-400 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Ingestion Successfully Executed</h3>
              <p className="text-xs text-emerald-300">{confirmResult.message}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block">Companies Created / Reused</span>
              <span className="text-lg font-bold text-emerald-400">
                +{confirmResult.companies_created} / ~{confirmResult.companies_updated}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block">Offices Created / Reused</span>
              <span className="text-lg font-bold text-indigo-400">
                +{confirmResult.offices_created} / ~{confirmResult.offices_updated}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-center col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-400 block">Jobs Created / Updated</span>
              <span className="text-lg font-bold text-cyan-400">
                +{confirmResult.jobs_created} / ~{confirmResult.jobs_updated}
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={resetAll}
              variant="secondary"
              size="sm"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              Import Another File
            </Button>
          </div>
        </div>
      )}

      {/* Upload Dropzone */}
      {!confirmResult && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-10 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500/60 hover:bg-slate-850 transition cursor-pointer text-center group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,.json"
              className="hidden"
            />
            <div className="p-3.5 rounded-2xl bg-slate-800 group-hover:bg-indigo-500/10 text-slate-400 group-hover:text-indigo-400 transition mb-3">
              <FileSpreadsheet className="h-8 w-8" />
            </div>
            <p className="text-sm font-semibold text-white">
              {file ? file.name : "Click to select or drag & drop CSV or JSON file"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {file
                ? `${(file.size / 1024).toFixed(1)} KB — Ready for strict validation preview`
                : "Supports UTF-8 / UTF-8 BOM standard 35-column dataset (.csv or .json)"}
            </p>
          </div>

          {previewError && (
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
              <span>{previewError}</span>
            </div>
          )}

          {file && !previewData && (
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={runPreview}
                loading={previewLoading}
                variant="primary"
                size="md"
                icon={<ShieldCheck className="h-4 w-4" />}
              >
                Validate & Preview Records
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Preview Section */}
      {previewData && !confirmResult && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-1 shadow-lg">
              <span className="text-[11px] text-slate-400 block font-medium">Total Scanned</span>
              <div className="text-2xl font-bold text-white">{previewData.total_records}</div>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 space-y-1 shadow-lg">
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Valid & Accepted
              </span>
              <div className="text-2xl font-bold text-emerald-300">{previewData.accepted_count}</div>
            </div>

            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-1 shadow-lg">
              <span className="text-[11px] text-rose-400 font-semibold flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5" />
                Issues / Rejected
              </span>
              <div className="text-2xl font-bold text-rose-300">{previewData.rejected_count}</div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 space-y-1 shadow-lg">
              <span className="text-[11px] text-indigo-400 font-semibold flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" />
                Entities Scope
              </span>
              <div className="text-[11px] text-slate-300 pt-0.5 space-y-0.5">
                <div>Companies: <span className="text-emerald-400 font-semibold">+{previewData.new_companies_count ?? 0}</span> | Reused: <span className="text-slate-400">~{previewData.existing_companies_count ?? 0}</span></div>
                <div>Offices: <span className="text-indigo-400 font-semibold">+{previewData.new_offices_count ?? 0}</span> | Jobs: <span className="text-cyan-400 font-semibold">+{previewData.new_jobs_count ?? 0}</span></div>
              </div>
            </div>
          </div>

          {confirmError && (
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
              <span>{confirmError}</span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-md">
            <div className="text-xs text-slate-300">
              {previewData.accepted_count > 0 ? (
                <span>
                  Ready to ingest{" "}
                  <strong className="text-emerald-400">{previewData.accepted_count} validated records</strong>{" "}
                  into PostgreSQL atomically.
                </span>
              ) : (
                <span className="text-rose-400">
                  No records met the verification requirements. Download the report below to review errors.
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
              {previewData.rejected_count > 0 && (
                <Button
                  type="button"
                  onClick={downloadInvalidRowsReport}
                  variant="outline"
                  size="sm"
                  icon={<Download className="h-3.5 w-3.5 text-rose-400" />}
                  className="border-rose-500/30 text-rose-300 hover:bg-rose-500/10"
                >
                  Download Invalid Rows ({previewData.rejected_count})
                </Button>
              )}

              <Button
                type="button"
                onClick={resetAll}
                variant="ghost"
                size="sm"
              >
                Reset
              </Button>

              <Button
                type="button"
                onClick={handleOpenConfirmModal}
                disabled={previewData.accepted_count === 0}
                variant="primary"
                size="sm"
                icon={<Database className="h-4 w-4" />}
              >
                Confirm & Ingest Verified Records
              </Button>
            </div>
          </div>

          {/* Records Inspection Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-3 w-16">Row #</th>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Office Location</th>
                    <th className="py-3 px-4">Job Opening</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Validation Notes / Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70 text-slate-300">
                  {previewData.items.map((item, idx) => (
                    <tr
                      key={`import-row-${item.row_number ?? idx}`}
                      className={item.valid ? "hover:bg-slate-800/40 transition" : "bg-rose-500/5 hover:bg-rose-500/10 transition"}
                    >
                      <td className="py-3 px-3 font-mono text-slate-500">
                        {item.row_number ?? idx + 1}
                      </td>

                      <td className="py-3 px-4 font-bold text-white">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                          <span>{item.company_name}</span>
                          {item.is_duplicate_company ? (
                            <Badge variant="indigo" size="sm">
                              Reusing Existing
                            </Badge>
                          ) : (
                            <Badge variant="success" size="sm">
                              New
                            </Badge>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-slate-300">
                        {item.locality || item.office_name ? (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                            <span>{item.locality || item.office_name}</span>
                            {item.is_duplicate_office && (
                              <span className="text-[10px] text-slate-400 bg-slate-800 px-1 rounded">
                                Reused
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">No office row</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-300">
                        {item.job_title ? (
                          <div className="flex items-center gap-1.5">
                            <Briefcase className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                            <span>{item.job_title}</span>
                            {item.vacancies != null && (
                              <span className="text-[10px] text-indigo-300 bg-indigo-500/10 px-1.5 py-0.2 rounded font-medium">
                                {item.vacancies} {item.vacancies === 1 ? "vac" : "vacs"}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 italic">Company/Office only</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        {item.valid ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            <CheckCircle2 className="h-3 w-3" /> Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                            <XCircle className="h-3 w-3" /> Issues
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-400">
                        {item.issues && item.issues.length > 0 ? (
                          <div className="space-y-0.5 text-rose-300 text-[11px]">
                            {item.issues.map((issue, i) => (
                              <div key={i} className="flex items-center gap-1">
                                <span className="h-1 w-1 rounded-full bg-rose-400" />
                                <span>{issue}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Validated successfully</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmModalOpen && previewData && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-400" />
                Confirm PostgreSQL Ingestion
              </h3>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to insert{" "}
              <strong className="text-emerald-400 font-semibold">{previewData.accepted_count} valid records</strong>{" "}
              into the live PostgreSQL database.
            </p>

            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 text-xs text-slate-300 space-y-2">
              <div className="flex justify-between">
                <span>New Companies to Create:</span>
                <span className="font-bold text-emerald-400">+{previewData.new_companies_count ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Existing Companies to Reuse:</span>
                <span className="font-bold text-slate-400">~{previewData.existing_companies_count ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Offices to Create:</span>
                <span className="font-bold text-indigo-400">+{previewData.new_offices_count ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span>Jobs to Create:</span>
                <span className="font-bold text-cyan-400">+{previewData.new_jobs_count ?? 0}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={confirming}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={confirming}
                onClick={runConfirm}
                icon={<Database className="h-4 w-4" />}
              >
                Execute Database Ingestion
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
