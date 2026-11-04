"use client";

import React, { useState, useRef } from "react";
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Database,
  RefreshCw,
  Loader2,
  ShieldCheck,
} from "lucide-react";
import { adminPreviewImport, adminConfirmImport } from "@/lib/admin-api";
import { ImportPreviewResponse, ImportConfirmResponse } from "@/types/api";

export default function AdminImportsPage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState<ImportConfirmResponse | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

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

  const runConfirm = async () => {
    if (!previewData?.raw_accepted_json) return;

    try {
      setConfirming(true);
      setConfirmError(null);
      const res = await adminConfirmImport(previewData.raw_accepted_json);
      setConfirmResult(res);
    } catch (err: unknown) {
      setConfirmError(err instanceof Error ? err.message : "Failed to ingest accepted records");
    } finally {
      setConfirming(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setPreviewData(null);
    setPreviewError(null);
    setConfirmResult(null);
    setConfirmError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <UploadCloud className="h-6 w-6 text-emerald-400" />
          Batch Data Import & Verification
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Upload bulk startup directories and job feeds in CSV or JSON format. Every record is strictly validated before database insertion.
        </p>
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
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block">Companies Created / Updated</span>
              <span className="text-lg font-bold text-emerald-400">
                +{confirmResult.companies_created} / ~{confirmResult.companies_updated}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center">
              <span className="text-[11px] text-slate-400 block">Offices Created / Updated</span>
              <span className="text-lg font-bold text-teal-400">
                +{confirmResult.offices_created} / ~{confirmResult.offices_updated}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-center col-span-2 sm:col-span-1">
              <span className="text-[11px] text-slate-400 block">Jobs Created / Updated</span>
              <span className="text-lg font-bold text-cyan-400">
                +{confirmResult.jobs_created} / ~{confirmResult.jobs_updated}
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={resetAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition border border-slate-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Import Another File</span>
            </button>
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
            className="flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-slate-700 hover:border-emerald-500/50 hover:bg-slate-800/40 transition cursor-pointer text-center group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,.json"
              className="hidden"
            />
            <div className="p-3 rounded-full bg-slate-800 group-hover:bg-emerald-500/10 text-slate-400 group-hover:text-emerald-400 transition mb-3">
              <UploadCloud className="h-8 w-8" />
            </div>
            <p className="text-sm font-semibold text-white">
              {file ? file.name : "Click to select or drag & drop CSV or JSON file"}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {file
                ? `${(file.size / 1024).toFixed(1)} KB — Ready for validation preview`
                : "Supports structured Bengaluru startup records (.csv or .json)"}
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
              <button
                type="button"
                onClick={runPreview}
                disabled={previewLoading}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold hover:brightness-110 transition disabled:opacity-50 shadow-md shadow-emerald-500/20"
              >
                {previewLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Validating Records...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>Validate & Preview File</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Preview Section */}
      {previewData && !confirmResult && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-5 space-y-1 shadow-lg">
              <span className="text-xs text-slate-400">Total Scanned Records</span>
              <div className="text-2xl font-bold text-white">{previewData.total_records}</div>
            </div>
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 space-y-1 shadow-lg">
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Validated & Accepted
              </span>
              <div className="text-2xl font-bold text-emerald-300">{previewData.accepted_count}</div>
            </div>
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 space-y-1 shadow-lg">
              <span className="text-xs text-rose-400 font-semibold flex items-center gap-1.5">
                <XCircle className="h-4 w-4" />
                Rejected / Incomplete
              </span>
              <div className="text-2xl font-bold text-rose-300">{previewData.rejected_count}</div>
            </div>
          </div>

          {confirmError && (
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
              <span>{confirmError}</span>
            </div>
          )}

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl border border-slate-800 bg-slate-900/80">
            <div className="text-xs text-slate-300">
              {previewData.accepted_count > 0 ? (
                <span>
                  Ready to ingest{" "}
                  <strong className="text-emerald-400">{previewData.accepted_count} verified records</strong>{" "}
                  into PostgreSQL.
                </span>
              ) : (
                <span className="text-rose-400">
                  No records met the Bengaluru verification requirements. Please fix issues and re-upload.
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={resetAll}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={runConfirm}
                disabled={confirming || previewData.accepted_count === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold hover:brightness-110 transition disabled:opacity-50 shadow-md shadow-emerald-500/20"
              >
                {confirming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Ingesting into DB...</span>
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    <span>Confirm & Ingest Verified Records</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Records Inspection Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-800/40 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Company Name</th>
                    <th className="py-3 px-4">Locality</th>
                    <th className="py-3 px-4">Job Title</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Validation Notes / Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {previewData.items.map((item, idx) => (
                    <tr
                      key={idx}
                      className={item.valid ? "hover:bg-slate-800/30" : "bg-rose-500/5 hover:bg-rose-500/10"}
                    >
                      <td className="py-3 px-4 font-semibold text-white">
                        {item.company_name}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {item.locality || "—"}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {item.job_title || "—"}
                      </td>
                      <td className="py-3 px-4">
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
                      <td className="py-3 px-4">
                        {item.issues && item.issues.length > 0 ? (
                          <div className="space-y-1">
                            {item.issues.map((issue, iIdx) => (
                              <span
                                key={iIdx}
                                className="inline-block text-[10px] text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20 mr-1"
                              >
                                {issue}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-emerald-400">All checks passed</span>
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
    </div>
  );
}
