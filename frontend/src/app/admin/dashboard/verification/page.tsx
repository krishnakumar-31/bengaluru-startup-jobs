"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Building2,
  Briefcase,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Edit,
  RefreshCw,
  Loader2,
  Sparkles,
} from "lucide-react";
import {
  adminGetVerificationHub,
  adminToggleCompanyVerify,
  adminSetJobStatus,
} from "@/lib/admin-api";
import { AdminVerificationResponse, ApiCompany, ApiJob } from "@/types/api";

export default function AdminVerificationPage() {
  const [data, setData] = useState<AdminVerificationResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"companies" | "unverified_jobs" | "expired_jobs">(
    "companies"
  );
  const [actionError, setActionError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchHubData = async () => {
    try {
      setLoading(true);
      setActionError(null);
      const res = await adminGetVerificationHub();
      setData(res);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to load verification hub data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHubData();
  }, []);

  const handleVerifyCompany = async (company: ApiCompany) => {
    try {
      setProcessingId(company.id);
      setActionError(null);
      await adminToggleCompanyVerify(company.id);
      fetchHubData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to verify company");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReactivateJob = async (job: ApiJob) => {
    try {
      setProcessingId(job.id);
      setActionError(null);
      await adminSetJobStatus(job.id, "active");
      fetchHubData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to reactivate job");
    } finally {
      setProcessingId(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <Loader2 className="h-7 w-7 text-emerald-400 animate-spin" />
        <p className="text-xs text-slate-400">Loading verification queues...</p>
      </div>
    );
  }

  const unverifiedCompanies = data?.unverified_companies || [];
  const unverifiedJobs = data?.unverified_jobs || [];
  const expiredJobs = data?.expired_jobs || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
            Data Quality & Verification Hub
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Audit unverified companies, examine listings without verified source proof, and review expired positions.
          </p>
        </div>
        <button
          onClick={fetchHubData}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition border border-slate-700 self-start sm:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Queues</span>
        </button>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("companies")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === "companies"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Unverified Companies</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 ml-1">
            {unverifiedCompanies.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("unverified_jobs")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === "unverified_jobs"
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Briefcase className="h-4 w-4" />
          <span>Unverified Jobs (No Source)</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 ml-1">
            {unverifiedJobs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("expired_jobs")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
            activeTab === "expired_jobs"
              ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Expired Jobs</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 ml-1">
            {expiredJobs.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Unverified Companies */}
      {activeTab === "companies" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
          {unverifiedCompanies.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-1">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-white">All Companies Verified</p>
              <p className="text-xs text-slate-400">
                100% of startup organizations in your database are currently marked as verified.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/40 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Industry</th>
                  <th className="py-3 px-4">Official Website</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {unverifiedCompanies.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {c.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {c.industry || "Technology"}
                    </td>
                    <td className="py-3.5 px-4">
                      {c.website || c.website_url ? (
                        <a
                          href={c.website || c.website_url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                        >
                          <span>{c.website || c.website_url}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-500">Not provided</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/admin/dashboard/companies/${c.id}/edit`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Edit Profile"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleVerifyCompany(c)}
                          disabled={processingId === c.id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition disabled:opacity-50"
                        >
                          {processingId === c.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          <span>Verify</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 2: Unverified Jobs (No Source URL) */}
      {activeTab === "unverified_jobs" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
          {unverifiedJobs.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-1">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-white">All Active Jobs Have Source Proof</p>
              <p className="text-xs text-slate-400">
                Every job posting is linked to a verified source URL.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/40 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Job Title</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Application URL</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {unverifiedJobs.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {j.title}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {j.company?.name || `Company #${j.company_id}`}
                    </td>
                    <td className="py-3.5 px-4">
                      {j.application_url ? (
                        <a
                          href={j.application_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                        >
                          <span className="line-clamp-1 max-w-[200px]">{j.application_url}</span>
                          <ExternalLink className="h-3 w-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="text-rose-400 font-medium">Missing Link</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/admin/dashboard/jobs/${j.id}/edit`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold transition"
                      >
                        <Edit className="h-3.5 w-3.5" />
                        <span>Add Source Proof</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Tab 3: Expired Jobs */}
      {activeTab === "expired_jobs" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
          {expiredJobs.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-1">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-white">No Expired Positions</p>
              <p className="text-xs text-slate-400">
                There are no job listings marked as expired.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/40 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Job Title</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Expiration Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {expiredJobs.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3.5 px-4 font-semibold text-white">
                      {j.title}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {j.company?.name || `Company #${j.company_id}`}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {j.expires_at ? new Date(j.expires_at).toLocaleDateString() : "Passed"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/admin/dashboard/jobs/${j.id}/edit`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Edit Details"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleReactivateJob(j)}
                          disabled={processingId === j.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold transition disabled:opacity-50"
                        >
                          {processingId === j.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          <span>Re-activate</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
