"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertCircle, Loader2, Briefcase, Sparkles, DollarSign, Building2 } from "lucide-react";
import { adminCreateJob, adminGetCompanies, adminGetOffices } from "@/lib/admin-api";
import { ApiCompany, OfficeResponse } from "@/types/api";
import { Button } from "@/components/ui/button";

export default function NewJobPage() {
  const router = useRouter();

  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [offices, setOffices] = useState<(OfficeResponse & { company_name?: string })[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form states
  const [companyId, setCompanyId] = useState<number | "">("");
  const [officeId, setOfficeId] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [workMode, setWorkMode] = useState("in-office");
  const [vacancies, setVacancies] = useState<number | "">(1);
  const [experienceLevel, setExperienceLevel] = useState("mid");
  const [experienceMin, setExperienceMin] = useState<number | "">("");
  const [experienceMax, setExperienceMax] = useState<number | "">("");
  const [salaryMin, setSalaryMin] = useState<number | "">("");
  const [salaryMax, setSalaryMax] = useState<number | "">("");
  const [currency, setCurrency] = useState("INR");
  const [skillsRaw, setSkillsRaw] = useState("Python, FastAPI, PostgreSQL");
  const [applicationUrl, setApplicationUrl] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("active");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        setLoadingInitial(true);
        const [compRes, offRes] = await Promise.all([
          adminGetCompanies({ limit: 100 }),
          adminGetOffices({ limit: 100 }),
        ]);
        if (!mounted) return;
        setCompanies(compRes.items);
        setOffices(offRes.items);
        if (compRes.items.length > 0) {
          setCompanyId(compRes.items[0].id);
        }
      } catch (err: unknown) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load companies/offices");
      } finally {
        if (mounted) setLoadingInitial(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const availableOffices = companyId
    ? offices.filter((off) => off.company_id === Number(companyId))
    : offices;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!companyId) {
      setError("Please select a company.");
      return;
    }
    if (!title.trim()) {
      setError("Job title is required.");
      return;
    }
    if (!description.trim()) {
      setError("Job description is required.");
      return;
    }

    if (
      salaryMin !== "" &&
      salaryMax !== "" &&
      Number(salaryMin) > Number(salaryMax)
    ) {
      setError("Minimum salary cannot exceed maximum salary.");
      return;
    }

    setSaving(true);
    setError(null);

    const skills = skillsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await adminCreateJob({
        company_id: Number(companyId),
        office_id: officeId ? Number(officeId) : undefined,
        title: title.trim(),
        slug: slug.trim() || undefined,
        description: description.trim(),
        employment_type: employmentType,
        work_mode: workMode,
        vacancies: vacancies !== "" ? Number(vacancies) : 1,
        experience_level: experienceLevel || undefined,
        experience_min: experienceMin !== "" ? Number(experienceMin) : undefined,
        experience_max: experienceMax !== "" ? Number(experienceMax) : undefined,
        workplace_type: workMode,
        salary_min: salaryMin !== "" ? Number(salaryMin) : undefined,
        salary_max: salaryMax !== "" ? Number(salaryMax) : undefined,
        currency: currency || "INR",
        salary_currency: currency || "INR",
        skills: skills.length > 0 ? skills : undefined,
        application_url: applicationUrl.trim() || undefined,
        source_url: sourceUrl.trim() || undefined,
        job_source_url: sourceUrl.trim() || undefined,
        status: status || "active",
      });

      router.push("/admin/dashboard/jobs");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create job posting");
      setSaving(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <Loader2 className="h-7 w-7 text-indigo-400 animate-spin" />
        <p className="text-xs text-slate-400">Loading form dependencies...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/dashboard/jobs"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-400 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Jobs</span>
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Briefcase className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Post New Job Opening</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Add a new job vacancy and attach it to an approved Bengaluru startup and office location.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 space-y-6 shadow-xl">
        {/* Company & Office Selection */}
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
            <Building2 className="h-4 w-4 text-indigo-400" />
            Company & Office Location
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Startup Company <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={companyId}
                onChange={(e) => {
                  setCompanyId(Number(e.target.value));
                  setOfficeId("");
                }}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              >
                <option value="">Select Company</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.is_verified ? "✓" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Bengaluru Office Location
              </label>
              <select
                value={officeId}
                onChange={(e) => setOfficeId(e.target.value ? Number(e.target.value) : "")}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              >
                <option value="">Main / HQ Office (or Unassigned)</option>
                {availableOffices.map((off) => (
                  <option key={off.id} value={off.id}>
                    {off.name || off.locality} ({off.locality || "Bengaluru"}) {off.is_headquarters ? "★ HQ" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Role Details */}
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            Role Details & Classification
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Job Title <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Senior Frontend Engineer"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                URL Slug <span className="text-slate-500 font-normal">(auto-generated if empty)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. senior-frontend-engineer"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Employment Type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Work Mode</label>
              <select
                value={workMode}
                onChange={(e) => setWorkMode(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              >
                <option value="in-office">In-Office</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Experience Level</label>
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              >
                <option value="entry">Entry Level</option>
                <option value="junior">Junior (1-3 yrs)</option>
                <option value="mid">Mid Level (3-5 yrs)</option>
                <option value="senior">Senior (5-8 yrs)</option>
                <option value="lead">Lead / Staff (8+ yrs)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Number of Vacancies</label>
              <input
                type="number"
                min="1"
                max="50"
                value={vacancies}
                onChange={(e) => setVacancies(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Min Experience (Yrs)</label>
              <input
                type="number"
                min="0"
                max="30"
                placeholder="e.g. 3"
                value={experienceMin}
                onChange={(e) => setExperienceMin(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Max Experience (Yrs)</label>
              <input
                type="number"
                min="0"
                max="30"
                placeholder="e.g. 6"
                value={experienceMax}
                onChange={(e) => setExperienceMax(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Compensation & Skills */}
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
            <DollarSign className="h-4 w-4 text-indigo-400" />
            Compensation & Required Skills
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Salary Min (INR)</label>
              <input
                type="number"
                step="50000"
                placeholder="e.g. 1500000"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Salary Max (INR)</label>
              <input
                type="number"
                step="50000"
                placeholder="e.g. 2800000"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Currency</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition font-mono"
              />
            </div>

            <div className="sm:col-span-3 space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Skills / Tech Stack <span className="text-slate-500 font-normal">(comma-separated)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. React, TypeScript, Next.js, GraphQL"
                value={skillsRaw}
                onChange={(e) => setSkillsRaw(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>
          </div>
        </div>

        {/* URLs & Description */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Direct Application URL</label>
              <input
                type="url"
                placeholder="https://jobs.lever.co/company/..."
                value={applicationUrl}
                onChange={(e) => setApplicationUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Original Job Source URL</label>
              <input
                type="url"
                placeholder="https://careers.company.com/job/..."
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Job Posting Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              >
                <option value="active">Active (Visible on public map)</option>
                <option value="expired">Expired</option>
                <option value="closed">Closed</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Job Description <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={5}
              required
              placeholder="Outline responsibilities, team structure, and qualifications..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-3.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition leading-relaxed"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Link href="/admin/dashboard/jobs">
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={saving}
            icon={<Save className="h-4 w-4" />}
          >
            Post Job
          </Button>
        </div>
      </form>
    </div>
  );
}
