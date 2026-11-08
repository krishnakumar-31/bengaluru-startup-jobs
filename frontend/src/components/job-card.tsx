"use client";

import { useState } from "react";
import {
  MapPin,
  Building2,
  Clock,
  Banknote,
  Bookmark,
  ExternalLink,
  CheckCircle2,
  Briefcase,
  Layers,
  Eye,
} from "lucide-react";
import { ApiJob } from "@/types";
import { formatSalaryRange, formatRelativeTime, getCompanyInitials } from "@/lib/formatters";

interface JobCardProps {
  job: ApiJob;
  onOpenCompanyModal?: (companyId: number) => void;
  onSelectLocality?: (locality: string) => void;
  onViewJobDetail?: (job: ApiJob) => void;
}

export function JobCard({
  job,
  onOpenCompanyModal,
  onSelectLocality,
  onViewJobDetail,
}: JobCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);

  const companyName = job.company?.name || "Bengaluru Tech Startup";
  const locality = job.locality || job.office?.locality || "Bengaluru";
  const logoUrl = job.company?.logo_url;
  const salaryDisplay = formatSalaryRange(job.salary_min, job.salary_max, job.currency || "INR");
  const timeDisplay = formatRelativeTime(job.posted_at || job.created_at);

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-500/40 hover:shadow-xl hover:shadow-indigo-500/5">
      {/* Top Banner: Logo, Company Name, Badges, Bookmark */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5">
            {/* Company Logo or Initials Avatar */}
            <div
              onClick={() => job.company_id && onOpenCompanyModal?.(job.company_id)}
              className="flex h-12 w-12 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 font-bold text-slate-700 text-sm border border-slate-200/80 group-hover:from-indigo-50 group-hover:to-indigo-100 group-hover:text-indigo-700 group-hover:border-indigo-200 transition-all shadow-xs"
              title={`View ${companyName} profile`}
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={`${companyName} logo`}
                  className="h-8 w-8 object-contain rounded-xl"
                  onError={(e) => {
                    (e.currentTarget as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                getCompanyInitials(companyName)
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => job.company_id && onOpenCompanyModal?.(job.company_id)}
                  className="font-bold text-slate-800 hover:text-indigo-600 transition-colors text-sm sm:text-base text-left truncate max-w-[180px] sm:max-w-[220px]"
                >
                  {companyName}
                </button>
                {job.company?.is_verified && (
                  <span
                    className="inline-flex items-center text-emerald-600 shrink-0"
                    title="Verified Bengaluru Tech Entity"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                )}
                {job.company?.industry && (
                  <span className="hidden sm:inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 shrink-0">
                    {job.company.industry}
                  </span>
                )}
              </div>

              <h3
                onClick={() => onViewJobDetail?.(job)}
                className="text-base sm:text-lg font-bold text-slate-900 mt-1 leading-snug cursor-pointer group-hover:text-indigo-600 transition-colors line-clamp-1"
                title={job.title}
              >
                {job.title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsBookmarked(!isBookmarked)}
            aria-label={isBookmarked ? "Remove Bookmark" : "Save Job"}
            className={`rounded-xl p-2 transition-colors cursor-pointer ${
              isBookmarked
                ? "bg-indigo-50 text-indigo-600"
                : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            }`}
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-indigo-600" : ""}`} />
          </button>
        </div>

        {/* Description Snippet */}
        <p className="mt-3.5 text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
          {job.description}
        </p>

        {/* Metadata Badges (Locality, Mode, Experience, Salary, Posted Time) */}
        <div className="mt-4 flex flex-wrap items-center gap-y-2 gap-x-3 text-xs text-slate-500">
          <button
            type="button"
            onClick={() => onSelectLocality?.(locality)}
            className="flex items-center gap-1 font-semibold text-indigo-600 hover:underline cursor-pointer"
            title="Filter by this corridor"
          >
            <MapPin className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
            <span>{locality}</span>
          </button>

          <div className="flex items-center gap-1 text-slate-600">
            <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="capitalize">{job.work_mode || job.workplace_type || "In-office"}</span>
          </div>

          <div className="flex items-center gap-1 text-slate-600">
            <Briefcase className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="capitalize">{job.employment_type?.replace("-", " ")}</span>
          </div>

          {job.vacancies && job.vacancies > 1 && (
            <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
              {job.vacancies} Vacancies
            </span>
          )}

          {job.experience_level && (
            <div className="flex items-center gap-1 text-slate-600">
              <Layers className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="capitalize">{job.experience_level}</span>
            </div>
          )}

          <div className="flex items-center gap-1 font-semibold text-emerald-700">
            <Banknote className="h-3.5 w-3.5 shrink-0" />
            <span>{salaryDisplay}</span>
          </div>

          <div className="flex items-center gap-1 text-slate-400 text-[11px]">
            <Clock className="h-3 w-3 shrink-0" />
            <span>{timeDisplay}</span>
          </div>
        </div>
      </div>

      {/* Skills Tags & Action Controls */}
      <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-1.5">
          {job.skills && job.skills.length > 0 ? (
            job.skills.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="rounded-lg bg-slate-100/80 px-2 py-0.5 text-[11px] font-medium text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-700 transition-colors"
              >
                {skill}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-400">Multiple tech skills</span>
          )}
          {job.skills && job.skills.length > 4 && (
            <span className="text-[10px] text-slate-400 font-medium">
              +{job.skills.length - 4}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onViewJobDetail?.(job)}
            className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition shadow-xs cursor-pointer"
          >
            <Eye className="h-3.5 w-3.5 text-slate-400" />
            <span>Details</span>
          </button>

          {job.application_url ? (
            <a
              href={job.application_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white shadow-sm shadow-indigo-600/25 transition hover:bg-indigo-700 active:scale-95 cursor-pointer"
            >
              <span>Apply</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <button
              type="button"
              onClick={() => job.company_id && onOpenCompanyModal?.(job.company_id)}
              className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
            >
              Company Portal
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
