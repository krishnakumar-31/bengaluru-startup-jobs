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
  RotateCcw,
} from "lucide-react";
import { adminGetJobs, adminSetJobStatus, adminDeleteJob } from "@/lib/admin-api";
import { ApiJob, PaginatedJobsResponse } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

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

  const handleResetFilters = () => {
    setSearch("");
    setLocalityFilter("");
    setStatusFilter("");
    setPage(1);
  };

  const handleToggleStatus = async (job: ApiJob) => {
    try {
      const nextStatus = job.status === "active" ? "closed" : "active";
      await adminSetJobStatus(job.id, nextStatus);
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

  const hasActiveFilters = Boolean(search || localityFilter || statusFilter);

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-indigo-400" />
              Job Postings Management
            </h2>
            <Badge variant="indigo" size="sm">
              {total} positions
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Oversee active postings, manage statuses, adjust compensation ranges, and attach offices.
          </p>
        </div>
        <Link href="/admin/dashboard/jobs/new">
          <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />}>
            Post New Job
          </Button>
        </Link>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-md">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5 relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by title, role or skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/60 pl-10 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          <div className="sm:col-span-3">
            <input
              type="text"
              placeholder="Filter by locality (e.g. Koramangala)..."
              value={localityFilter}
              onChange={(e) => setLocalityFilter(e.target.value)}
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/60 px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="expired">Expired</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex items-center gap-2">
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              icon={<Filter className="h-3.5 w-3.5" />}
              className="w-full justify-center"
            >
              Filter
            </Button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="p-2 rounded-xl border border-slate-700/70 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition text-xs"
                title="Reset filters"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">Job Title & Company</th>
                <th className="py-3.5 px-4">Location / Office</th>
                <th className="py-3.5 px-4">Type & Compensation</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <div className="inline-flex flex-col items-center gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
                      <span className="text-xs">Loading job postings...</span>
                    </div>
                  </td>
                </tr>
              ) : jobs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8">
                    <EmptyState
                      variant="dark"
                      icon={<Briefcase className="h-6 w-6" />}
                      title="No job postings found"
                      description="No job openings match your search and filter criteria."
                      actionLabel={hasActiveFilters ? "Reset Filters" : "Post First Job"}
                      onAction={hasActiveFilters ? handleResetFilters : () => {}}
                    />
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-800/40 transition">
                    {/* Job Title & Company */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="font-bold text-white text-sm hover:text-indigo-400 transition">
                        <Link href={`/admin/dashboard/jobs/${job.id}/edit`}>
                          {job.title}
                        </Link>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-1">
                        <Building2 className="h-3 w-3 text-slate-500" />
                        <span>{job.company?.name || `Company #${job.company_id}`}</span>
                        {job.application_url && (
                          <a
                            href={job.application_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-500 hover:text-indigo-400 ml-1 inline-flex items-center gap-0.5 transition"
                            title="Open Application URL"
                          >
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Location */}
                    <td className="py-4 px-4 text-slate-300">
                      <div className="inline-flex items-center gap-1.5 text-xs">
                        <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                        <span className="font-medium text-slate-200">
                          {job.office?.locality || job.locality || "Bengaluru (HQ)"}
                        </span>
                      </div>
                      {job.workplace_type && (
                        <span className="block text-[11px] text-slate-500 capitalize mt-0.5">
                          {job.workplace_type}
                        </span>
                      )}
                    </td>

                    {/* Compensation & Type */}
                    <td className="py-4 px-4">
                      <div className="font-medium text-slate-200">
                        {formatSalary(job.salary_min, job.salary_max, job.currency || job.salary_currency)}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        <span className="capitalize">{job.employment_type?.replace("_", " ") || "Full-time"}</span> ·{" "}
                        <span className="font-semibold text-emerald-400">
                          {job.vacancies ?? 1} {(job.vacancies ?? 1) === 1 ? "vacancy" : "vacancies"}
                        </span>
                      </div>
                    </td>

                    {/* Status Badge & Quick Toggle */}
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(job)}
                        title="Click to toggle status"
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition cursor-pointer ${
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
                    <td className="py-4 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          href={`/admin/dashboard/jobs/${job.id}/edit`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Edit Job"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(job)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
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

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-slate-800 text-xs text-slate-400 bg-slate-950/40">
            <span>
              Showing page <strong className="text-white">{page}</strong> of{" "}
              <strong className="text-white">{totalPages}</strong> ({total} total jobs)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="h-6 w-6" />
              <h3 className="text-base font-bold text-white">Delete Job Posting?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to remove <strong>{deleteTarget.title}</strong>? This action permanently removes the job posting from the public map and listings.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={confirmDelete}
                loading={deleting}
              >
                Confirm Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
