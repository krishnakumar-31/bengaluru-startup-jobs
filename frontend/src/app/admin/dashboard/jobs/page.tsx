"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  ExternalLink,
  Edit,
  Trash2,
  AlertTriangle,
  Building2,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { adminGetJobs, adminSetJobStatus, adminDeleteJob } from "@/lib/admin-api";
import { ApiJob, PaginatedJobsResponse } from "@/types/api";

export default function AdminJobsPage() {
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [localityFilter, setLocalityFilter] = useState("");

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<ApiJob | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setActionError(null);
      const res: PaginatedJobsResponse = await adminGetJobs({
        page,
        limit,
        search: search.trim() || undefined,
        status: statusFilter || undefined,
        locality: localityFilter.trim() || undefined,
      });
      setJobs(res.items);
      setTotal(res.total);
      setTotalPages(res.total_pages || Math.ceil(res.total / limit) || 1);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchJobs();
  };

  const handleToggleStatus = async (job: ApiJob) => {
    try {
      const nextStatus = job.status === "active" ? "closed" : "active";
      await adminSetJobStatus(job.id, nextStatus);
      // Update local state
      setJobs((prev) =>
        prev.map((j) => (j.id === job.id ? { ...j, status: nextStatus, is_active: nextStatus === "active" } : j))
      );
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to change job status");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      setActionError(null);
      await adminDeleteJob(deleteTarget.id);
      setDeleteTarget(null);
      fetchJobs();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to delete job");
    } finally {
      setDeleting(false);
    }
  };

  const formatSalary = (min?: number | null, max?: number | null, curr?: string | null) => {
    if (!min && !max) return "Not disclosed";
    const c = curr || "INR";
    if (min && max) return `${c} ${(min / 100000).toFixed(1)}L - ${(max / 100000).toFixed(1)}L`;
    if (min) return `${c} ${(min / 100000).toFixed(1)}L+`;
    if (max) return `Up to ${c} ${(max / 100000).toFixed(1)}L`;
    return "Not disclosed";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-emerald-400" />
            Job Listings Management
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Oversee active postings, manage statuses, adjust compensation ranges, and attach offices.
          </p>
        </div>
        <Link
          href="/admin/dashboard/jobs/new"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold hover:brightness-110 transition shadow-md shadow-emerald-500/20"
        >
          <Plus className="h-4 w-4" />
          <span>Post New Job</span>
        </Link>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-3">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5 relative">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search by title or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <input
              type="text"
              placeholder="Filter by locality (e.g. Koramangala)..."
              value={localityFilter}
              onChange={(e) => setLocalityFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition border border-slate-700"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Filter</span>
            </button>
            {(search || localityFilter || statusFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setLocalityFilter("");
                  setStatusFilter("");
                  setPage(1);
                }}
                className="px-2.5 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/40 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Job Title & Company</th>
                <th className="py-3 px-4">Location / Office</th>
                <th className="py-3 px-4">Type & Compensation</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                      <span>Loading job postings...</span>
                    </div>
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No jobs matching your filter criteria.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/30 transition">
                    {/* Job Title & Company */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white hover:text-emerald-400 transition">
                        <Link href={`/admin/dashboard/jobs/${job.id}/edit`}>
                          {job.title}
                        </Link>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                        <Building2 className="h-3 w-3 text-slate-500" />
                        <span>{job.company?.name || `Company #${job.company_id}`}</span>
                        {job.application_url && (
                          <a
                            href={job.application_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-500 hover:text-emerald-400 ml-1 inline-flex items-center gap-0.5"
                            title="Open Application URL"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-3.5 px-4 text-slate-300">
                      <div className="inline-flex items-center gap-1 text-[11px]">
                        <MapPin className="h-3 w-3 text-teal-400" />
                        <span>
                          {job.office?.locality || job.locality || "Bengaluru (HQ)"}
                        </span>
                      </div>
                      {job.workplace_type && (
                        <span className="block text-[10px] text-slate-500 capitalize">
                          {job.workplace_type}
                        </span>
                      )}
                    </td>

                    {/* Compensation & Type */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-200">
                        {formatSalary(job.salary_min, job.salary_max, job.currency || job.salary_currency)}
                      </div>
                      <div className="text-[10px] text-slate-400 capitalize">
                        {job.employment_type?.replace("_", " ") || "Full-time"} · {job.experience_level || "Any Exp"}
                      </div>
                    </td>

                    {/* Status Badge & Quick Toggle */}
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => handleToggleStatus(job)}
                        title="Click to toggle status"
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition ${
                          job.status === "active"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                            : job.status === "expired"
                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20"
                        }`}
                      >
                        {job.status === "active" && <CheckCircle2 className="h-3 w-3" />}
                        {job.status === "expired" && <Clock className="h-3 w-3" />}
                        {job.status === "closed" && <XCircle className="h-3 w-3" />}
                        <span className="capitalize">{job.status}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/admin/dashboard/jobs/${job.id}/edit`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition"
                          title="Edit Job"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(job)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          title="Delete Job"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-800 bg-slate-900/60 text-xs text-slate-400">
          <div>
            Showing{" "}
            <span className="font-semibold text-white">
              {jobs.length ? (page - 1) * limit + 1 : 0}
            </span>{" "}
            to{" "}
            <span className="font-semibold text-white">
              {Math.min(page * limit, total)}
            </span>{" "}
            of <span className="font-semibold text-white">{total}</span> jobs
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white disabled:opacity-40 transition"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-white">Confirm Job Deletion</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Are you sure you want to permanently delete the job posting{" "}
                  <span className="text-white font-semibold">&ldquo;{deleteTarget.title}&rdquo;</span>?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={confirmDelete}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                {deleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Delete Job</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
