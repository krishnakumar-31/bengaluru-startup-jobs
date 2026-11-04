"use client";

import { useEffect, useState } from "react";
import {
  X,
  Building2,
  Globe,
  MapPin,
  Users,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { ApiCompany, ApiJob, ApiOffice } from "@/types";
import { fetchCompanyById, fetchCompanyOffices, fetchJobs } from "@/lib/api";
import { formatSalaryRange, getCompanyInitials } from "@/lib/formatters";

interface CompanyModalProps {
  companyId: number | null;
  onClose: () => void;
  onApplyJob?: (job: ApiJob) => void;
}

export function CompanyModal({ companyId, onClose, onApplyJob }: CompanyModalProps) {
  const [company, setCompany] = useState<ApiCompany | null>(null);
  const [offices, setOffices] = useState<ApiOffice[]>([]);
  const [jobs, setJobs] = useState<ApiJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;

    let isMounted = true;

    Promise.all([
      fetchCompanyById(companyId),
      fetchCompanyOffices(companyId).catch(() => []),
      fetchJobs({ company_id: companyId }).catch(() => ({ items: [] })),
    ])
      .then(([companyData, officesData, jobsData]) => {
        if (!isMounted) return;
        setCompany(companyData);
        setOffices(officesData);
        setJobs(jobsData.items || []);
        setError(null);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Failed to load company details");
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [companyId]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!companyId) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            <span className="text-sm text-slate-500 font-medium">Loading company profile...</span>
          </div>
        ) : error ? (
          <div className="py-12 text-center space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-900">Unable to load company details</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">{error}</p>
            <button
              onClick={onClose}
              className="mt-2 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        ) : company ? (
          <div className="space-y-6">
            {/* Header: Logo, Name, Industry, Badges */}
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 text-white font-extrabold text-2xl shadow-md shadow-emerald-500/20">
                {company.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={company.logo_url}
                    alt={`${company.name} logo`}
                    className="h-12 w-12 object-contain rounded-xl"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  getCompanyInitials(company.name)
                )}
              </div>

              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">{company.name}</h2>
                  {company.is_verified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      Verified
                    </span>
                  )}
                  {company.industry && (
                    <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {company.industry}
                    </span>
                  )}
                </div>

                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>{company.website.replace(/^https?:\/\//, "")}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Meta Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 border-y border-slate-100 py-3">
              {company.company_size && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Users className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{company.company_size} Employees</span>
                </div>
              )}
              {company.founded_year && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>Founded {company.founded_year}</span>
                </div>
              )}
              {company.locality && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{company.locality}, Bengaluru</span>
                </div>
              )}
            </div>

            {/* About / Description */}
            {company.description && (
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  About {company.name}
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {company.description}
                </p>
              </div>
            )}

            {/* Office Locations */}
            {offices.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Bengaluru Offices ({offices.length})
                </h4>
                <div className="space-y-2">
                  {offices.map((office) => (
                    <div
                      key={office.id}
                      className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3 text-xs text-slate-700 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">{office.locality}</span>
                        {office.postal_code && (
                          <span className="font-mono text-slate-500">PIN: {office.postal_code}</span>
                        )}
                      </div>
                      {office.address && <p className="text-slate-600">{office.address}</p>}
                      {office.latitude && office.longitude && (
                        <p className="text-[11px] font-mono text-emerald-700">
                          {office.latitude.toFixed(4)}° N, {office.longitude.toFixed(4)}° E
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Openings for this company */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Open Positions ({jobs.length})
                </h4>
              </div>

              {jobs.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 hover:border-emerald-300 hover:bg-emerald-50/30 transition"
                    >
                      <div className="min-w-0">
                        <h5 className="text-sm font-semibold text-slate-900 truncate">{job.title}</h5>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                          <span>{job.employment_type}</span>
                          <span>•</span>
                          <span>{formatSalaryRange(job.salary_min, job.salary_max, job.currency || "INR")}</span>
                        </div>
                      </div>

                      {job.application_url && (
                        <a
                          href={job.application_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => onApplyJob?.(job)}
                          className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition"
                        >
                          <span>Apply</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
                  No active openings listed at this moment.
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
