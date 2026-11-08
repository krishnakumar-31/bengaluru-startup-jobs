"use client";

import {
  Briefcase,
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
  onViewJobDetail?: (job: ApiJob) => void;
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
  onViewJobDetail,
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
    <section id="job-listings" className="scroll-mt-16 py-16 bg-slate-50/70 border-t border-slate-200/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Verified Directory Assurance Banner */}
        <div className="mb-8 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/80 via-white to-emerald-50/50 p-4 sm:p-5 text-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 backdrop-blur-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shrink-0 shadow-sm shadow-indigo-600/30">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div className="text-xs sm:text-sm">
              <span className="font-bold text-slate-900 block sm:inline">
                Genuine Bengaluru Engineering Vacancies:
              </span>{" "}
              <span className="text-slate-600">
                Every opportunity is backed by physical operating premises in Bengaluru, verified company entities,
                and direct application URLs.
              </span>
            </div>
          </div>
          <span className="rounded-full bg-indigo-100/80 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-800 shrink-0 self-start sm:self-auto">
            100% Live Telemetry
          </span>
        </div>

        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-600 border border-indigo-200/80">
                <Briefcase className="h-4 w-4" />
              </div>
              <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
                Bengaluru Startup Openings
              </h2>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              Showing <span className="font-bold text-slate-900">{total}</span> verified openings
              {filters.locality && ` in ${filters.locality}`}
              {filters.keyword && ` matching "${filters.keyword}"`}
              {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
            </p>
          </div>

          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition shadow-xs self-start sm:self-auto cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
              <span>Reset Active Filters</span>
            </button>
          )}
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={`job-skeleton-${n}`}
                className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm animate-pulse space-y-4"
              >
                <div className="flex items-center gap-3.5">
                  <div className="h-12 w-12 rounded-2xl bg-slate-200" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-1/4" />
                    <div className="h-5 bg-slate-200 rounded w-3/4" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-3.5 bg-slate-100 rounded w-full" />
                  <div className="h-3.5 bg-slate-100 rounded w-5/6" />
                </div>
                <div className="flex gap-2 pt-2">
                  <div className="h-6 w-20 bg-slate-100 rounded-lg" />
                  <div className="h-6 w-24 bg-slate-100 rounded-lg" />
                  <div className="h-6 w-28 bg-slate-100 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="rounded-2xl border border-rose-200 bg-white p-12 text-center shadow-sm max-w-lg mx-auto">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-100 mb-3">
              <Briefcase className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Failed to load startup roles</h3>
            <p className="mt-1 text-xs text-slate-500">{error}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition cursor-pointer"
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
                  onViewJobDetail={onViewJobDetail}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200/80 pt-6">
                <span className="text-xs text-slate-500">
                  Showing page <span className="font-semibold text-slate-900">{currentPage}</span> of{" "}
                  <span className="font-semibold text-slate-900">{totalPages}</span> ({total} total openings)
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={!hasPrev || currentPage <= 1}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={`page-btn-${p}`}
                      onClick={() => onPageChange(p)}
                      className={`h-8 w-8 rounded-xl text-xs font-bold transition cursor-pointer ${
                        p === currentPage
                          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {p}
                    </button>
                  ))}

                  <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={!hasNext || currentPage >= totalPages}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
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
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-xs max-w-md mx-auto">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-400 border border-slate-200/80 mb-3">
              <Filter className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">No matching startup roles found</h3>
            <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
              No jobs in the verified database match your current filters. Try resetting filters or searching for different tech keywords.
            </p>
            <button
              onClick={onResetFilters}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset All Filters</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
