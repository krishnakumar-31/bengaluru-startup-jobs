"use client";

import {
  Briefcase,
  AlertCircle,
  RotateCcw,
  Filter,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { ApiJob, FilterState, PaginatedResponse } from "@/types";
import { JobCard } from "@/components/job-card";

interface JobListingsProps {
  jobsData: PaginatedResponse<ApiJob> | null;
  loading: boolean;
  error?: string | null;
  filters: FilterState;
  currentPage: number;
  onPageChange: (newPage: number) => void;
  onResetFilters: () => void;
  onOpenCompanyModal?: (companyId: number) => void;
  onSelectLocality?: (locality: string) => void;
  onRetry?: () => void;
}

export function JobListings({
  jobsData,
  loading,
  error,
  filters,
  currentPage,
  onPageChange,
  onResetFilters,
  onOpenCompanyModal,
  onSelectLocality,
  onRetry,
}: JobListingsProps) {
  const hasActiveFilters =
    Boolean(filters.keyword) ||
    Boolean(filters.locality) ||
    filters.roleType !== "all" ||
    filters.workplaceType !== "all" ||
    filters.experienceLevel !== "all" ||
    Boolean(filters.skills) ||
    Boolean(filters.company);

  const jobs = jobsData?.items || [];
  const total = jobsData?.total || 0;
  const totalPages = jobsData?.total_pages || 1;
  const hasNext = jobsData?.has_next || false;
  const hasPrev = jobsData?.has_prev || false;

  return (
    <section id="job-listings" className="scroll-mt-20 py-16 bg-slate-50 border-t border-slate-200/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Verified Database Banner */}
        <div className="mb-8 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 sm:p-5 text-emerald-950 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <span className="font-bold">Live PostgreSQL Ingestion &amp; Verified Startup Database:</span>
              <p className="text-emerald-900/90 text-xs sm:text-sm mt-0.5">
                Every startup role listed below is backed by verified office coordinates, official company websites,
                and direct application URLs queried live from the PostgreSQL database through FastAPI REST APIs.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-200/80 px-3 py-1 text-xs font-semibold text-emerald-900 shrink-0">
            Phase 2: Live APIs
          </span>
        </div>

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                <Briefcase className="h-4 w-4" />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Bengaluru Startup Roles
              </h2>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Showing <span className="font-semibold text-slate-900">{total}</span> verified openings
              {filters.locality && ` in ${filters.locality}`}
              {filters.keyword && ` matching "${filters.keyword}"`}
              {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
            </p>
          </div>

          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition shadow-sm self-start sm:self-auto"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-pulse space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-slate-200" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-1/3" />
                    <div className="h-5 bg-slate-200 rounded w-3/4" />
                  </div>
                </div>
                <div className="h-12 bg-slate-100 rounded-xl" />
                <div className="flex gap-2">
                  <div className="h-6 w-20 bg-slate-200 rounded" />
                  <div className="h-6 w-24 bg-slate-200 rounded" />
                  <div className="h-6 w-28 bg-slate-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="rounded-2xl border border-rose-200 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">Failed to load startup roles</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Retry Connection</span>
              </button>
            )}
          </div>
        )}

        {/* Success Grid */}
        {!loading && !error && jobs.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onOpenCompanyModal={onOpenCompanyModal}
                  onSelectLocality={onSelectLocality}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-6">
                <span className="text-xs text-slate-500">
                  Showing page <span className="font-semibold text-slate-900">{currentPage}</span> of{" "}
                  <span className="font-semibold text-slate-900">{totalPages}</span> ({total} total openings)
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={!hasPrev || currentPage <= 1}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => onPageChange(p)}
                      className={`h-8 w-8 rounded-xl text-xs font-semibold transition ${
                        p === currentPage
                          ? "bg-emerald-600 text-white shadow-sm"
                          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={!hasNext || currentPage >= totalPages}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && !error && jobs.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <Filter className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-slate-900">No matching startup roles found</h3>
            <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
              No jobs in the database match your current filters. Try resetting filters or searching for different tech keywords.
            </p>
            <button
              onClick={onResetFilters}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-700"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset All Filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
