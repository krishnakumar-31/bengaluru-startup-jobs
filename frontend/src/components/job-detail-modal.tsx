"use client";

import { useEffect } from "react";
import {
  X,
  Briefcase,
  MapPin,
  Building2,
  Banknote,
  Clock,
  Layers,
  ExternalLink,
  CheckCircle2,
  Share2,
} from "lucide-react";
import { ApiJob } from "@/types";
import { formatSalaryRange, formatRelativeTime, getCompanyInitials } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface JobDetailModalProps {
  job: ApiJob | null;
  onClose: () => void;
  onOpenCompanyModal?: (companyId: number) => void;
}

export function JobDetailModal({
  job,
  onClose,
  onOpenCompanyModal,
}: JobDetailModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (job) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [job, onClose]);

  if (!job) return null;

  const companyName = job.company?.name || "Bengaluru Startup";
  const locality = job.locality || job.office?.locality || "Bengaluru";
  const salaryDisplay = formatSalaryRange(job.salary_min, job.salary_max, job.currency || "INR");
  const timeDisplay = formatRelativeTime(job.posted_at || job.created_at);
  const initials = getCompanyInitials(companyName);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6 text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Action Controls */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <Badge variant="indigo" size="md">
            Verified Vacancy
          </Badge>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (typeof navigator !== "undefined" && navigator.clipboard) {
                  navigator.clipboard.writeText(window.location.href);
                }
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              title="Copy share link"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Company & Role Header */}
        <div className="flex items-start gap-4">
          <div
            onClick={() => job.company_id && onOpenCompanyModal?.(job.company_id)}
            className="flex h-14 w-14 shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-indigo-100 font-bold text-indigo-700 text-base border border-indigo-200/80 shadow-xs hover:scale-105 transition"
            title={`View ${companyName} profile`}
          >
            {job.company?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={job.company.logo_url}
                alt={companyName}
                className="h-10 w-10 object-contain rounded-xl"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              initials
            )}
          </div>

          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => job.company_id && onOpenCompanyModal?.(job.company_id)}
                className="text-sm font-semibold text-indigo-600 hover:underline flex items-center gap-1 truncate"
              >
                <span>{companyName}</span>
                {job.company?.is_verified && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                )}
              </button>
              {job.company?.industry && (
                <span className="text-xs text-slate-400">• {job.company.industry}</span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {job.title}
            </h2>
          </div>
        </div>

        {/* Key Role Meta Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/90 rounded-2xl p-4 border border-slate-100">
          <div className="space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Location
            </span>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
              <MapPin className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span className="truncate">{locality}</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Work Mode
            </span>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
              <Building2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span className="capitalize">{job.work_mode || "In-Office"}</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Employment
            </span>
            <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
              <Briefcase className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span className="capitalize">{job.employment_type?.replace("-", " ")}</span>
            </div>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Compensation
            </span>
            <div className="flex items-center gap-1 text-xs font-bold text-emerald-700">
              <Banknote className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{salaryDisplay}</span>
            </div>
          </div>
        </div>

        {/* Description Section */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Job Description &amp; Responsibilities
          </h3>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
            {job.description || "Detailed technical description not provided. Please refer to company application portal."}
          </div>
        </div>

        {/* Required Tech Skills */}
        {job.skills && job.skills.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              Required Skills &amp; Technologies
            </h3>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-lg bg-indigo-50 border border-indigo-200/80 px-2.5 py-1 text-xs font-semibold text-indigo-800"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Experience & Vacancies Footer info */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-3">
            {job.experience_level && (
              <span className="flex items-center gap-1">
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                <strong className="text-slate-700 capitalize">{job.experience_level}</strong>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-slate-400" />
              <span>Posted {timeDisplay}</span>
            </span>
          </div>

          {job.vacancies && job.vacancies > 1 && (
            <span className="font-semibold text-indigo-600">
              {job.vacancies} open headcount vacancies
            </span>
          )}
        </div>

        {/* Application CTA Bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" size="md" onClick={onClose}>
            Close
          </Button>
          {job.application_url ? (
            <a
              href={job.application_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-700 transition"
            >
              <span>Apply on Official Careers Portal</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={() => job.company_id && onOpenCompanyModal?.(job.company_id)}
            >
              Contact Company
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
