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
  Compass,
  Sparkles,
} from "lucide-react";
import { ApiCompany, ApiJob, ApiOffice } from "@/types";
import { fetchCompanyById, fetchCompanyOffices, fetchJobs } from "@/lib/api";
import { formatSalaryRange, getCompanyInitials } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";

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
  const [activeTab, setActiveTab] = useState<"overview" | "offices" | "jobs">("overview");

  useEffect(() => {
    if (!companyId) return;

    let isMounted = true;
    setLoading(true);
    setActiveTab("overview");

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 sm:p-8 text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
              Loading Verified Company Dossier...
            </span>
          </div>
        ) : error ? (
          <div className="py-12 text-center space-y-3">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/80">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Unable to load company details</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">{error}</p>
            <button
              onClick={onClose}
              className="mt-2 inline-flex items-center rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        ) : company ? (
          <div className="space-y-6">
            {/* Header: Logo, Name, Industry, Badges */}
            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white font-extrabold text-2xl shadow-md shadow-indigo-500/20">
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

              <div className="space-y-1.5 flex-1 min-w-0 pr-8">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                    {company.name}
                  </h2>
                  {company.is_verified && (
                    <Badge variant="success" size="sm">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Verified Entity</span>
                    </Badge>
                  )}
                  {company.industry && (
                    <Badge variant="default" size="sm">
                      {company.industry}
                    </Badge>
                  )}
                </div>

                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    <Globe className="h-3.5 w-3.5" />
                    <span>{company.website.replace(/^https?:\/\//, "")}</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Quick Meta Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 border-y border-slate-100 py-3">
              {company.company_size && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Users className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>{company.company_size} Team</span>
                </div>
              )}
              {company.founded_year && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>Est. {company.founded_year}</span>
                </div>
              )}
              {company.locality && (
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <MapPin className="h-4 w-4 text-indigo-600 shrink-0" />
                  <span>{company.locality}</span>
                </div>
              )}
              {company.cin && (
                <div className="flex items-center gap-1.5 text-xs text-slate-600" title={`MCA CIN: ${company.cin}`}>
                  <span className="font-bold text-slate-400 text-[10px]">CIN:</span>
                  <span className="font-mono text-[11px] text-slate-700 truncate">{company.cin}</span>
                </div>
              )}
            </div>

            {/* Interactive Section Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === "overview"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("offices")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === "offices"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>Bengaluru Offices</span>
                <span className="rounded-full bg-slate-200/80 px-1.5 py-0.2 text-[10px] text-slate-800">
                  {offices.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("jobs")}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                  activeTab === "jobs"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>Open Positions</span>
                <span className="rounded-full bg-indigo-100 text-indigo-800 px-1.5 py-0.2 text-[10px] font-bold">
                  {jobs.length}
                </span>
              </button>
            </div>

            {/* TAB 1: Overview */}
            {activeTab === "overview" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    About {company.name}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/60 p-4 rounded-xl border border-slate-100">
                    {company.description || "Company description has not been provided yet."}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: Office Locations */}
            {activeTab === "offices" && (
              <div className="space-y-3">
                {offices.length > 0 ? (
                  offices.map((office) => (
                    <div
                      key={office.id}
                      className="rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 text-xs text-slate-700 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
                          <MapPin className="h-4 w-4 text-indigo-600" />
                          <span>{office.locality}</span>
                        </div>
                        {office.postal_code && (
                          <span className="font-mono text-slate-500 font-medium">PIN: {office.postal_code}</span>
                        )}
                      </div>
                      {office.address && <p className="text-slate-600 pl-5.5">{office.address}</p>}
                      {office.latitude && office.longitude && (
                        <div className="flex items-center gap-2 pl-5.5 pt-1 text-[11px] font-mono text-indigo-600">
                          <Compass className="h-3.5 w-3.5" />
                          <span>
                            {office.latitude.toFixed(4)}° N, {office.longitude.toFixed(4)}° E (Geo-Validated)
                          </span>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                    No physical office premises registered yet.
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Active Openings */}
            {activeTab === "jobs" && (
              <div className="space-y-3">
                {jobs.length > 0 ? (
                  <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                    {jobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/90 p-3.5 hover:border-indigo-300 hover:bg-indigo-50/20 transition"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <h5 className="text-sm font-bold text-slate-900 truncate">{job.title}</h5>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span className="capitalize">{job.employment_type?.replace("-", " ")}</span>
                            <span>•</span>
                            <span className="font-semibold text-emerald-700">
                              {formatSalaryRange(job.salary_min, job.salary_max, job.currency || "INR")}
                            </span>
                          </div>
                        </div>

                        {job.application_url && (
                          <a
                            href={job.application_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => onApplyJob?.(job)}
                            className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition shadow-xs"
                          >
                            <span>Apply</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                    <Sparkles className="h-6 w-6 text-slate-400 mx-auto mb-2" />
                    No active engineering vacancies currently open for this company.
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
