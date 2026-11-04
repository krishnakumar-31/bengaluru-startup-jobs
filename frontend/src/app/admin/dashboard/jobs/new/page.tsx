"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertCircle, Loader2 } from "lucide-react";
import { adminCreateJob, adminGetCompanies, adminGetOffices } from "@/lib/admin-api";
import { ApiCompany, OfficeResponse } from "@/types/api";

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
  const [experienceLevel, setExperienceLevel] = useState("mid");
  const [workplaceType, setWorkplaceType] = useState("in_office");
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

  // Filter available offices based on selected company
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
        experience_level: experienceLevel || undefined,
        workplace_type: workplaceType || undefined,
        salary_min: salaryMin !== "" ? Number(salaryMin) : undefined,
        salary_max: salaryMax !== "" ? Number(salaryMax) : undefined,
        currency: currency || "INR",
        skills: skills.length > 0 ? skills : undefined,
        application_url: applicationUrl.trim() || undefined,
        source_url: sourceUrl.trim() || undefined,
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
        <Loader2 className="h-7 w-7 text-emerald-400 animate-spin" />
        <p className="text-xs text-slate-400">Loading form prerequisites...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/admin/dashboard/jobs"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Jobs</span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-white mt-2">Create Job Posting</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Add an engineering, product, or business role linked to a verified Bengaluru startup.
        </p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-2 border-b border-slate-800/80">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Target Company <span className="text-emerald-400">*</span>
            </label>
            <select
              value={companyId}
              required
              onChange={(e) => {
                setCompanyId(Number(e.target.value));
                setOfficeId(""); // reset selected office when company changes
              }}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="" disabled>Select Company</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.is_verified ? "✓" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Attached Office Location
            </label>
            <select
              value={officeId}
              onChange={(e) => setOfficeId(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="">No specific office (Company HQ)</option>
              {availableOffices.map((off) => (
                <option key={off.id} value={off.id}>
                  {off.locality || "Bengaluru"} - {off.address ? off.address.substring(0, 35) : "Office #" + off.id}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Job Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Job Title <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Senior Backend Engineer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Slug <span className="text-slate-500">(auto-generated if empty)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. senior-backend-engineer"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Employment Type</label>
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="full_time">Full-time</option>
              <option value="part_time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="internship">Internship</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Experience Level</label>
            <select
              value={experienceLevel}
              onChange={(e) => setExperienceLevel(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="entry">Entry Level (0-2 yrs)</option>
              <option value="mid">Mid Level (2-5 yrs)</option>
              <option value="senior">Senior (5-8 yrs)</option>
              <option value="lead">Lead / Staff (8+ yrs)</option>
              <option value="executive">Director / VP</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Workplace Arrangement</label>
            <select
              value={workplaceType}
              onChange={(e) => setWorkplaceType(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="in_office">On-site in Bengaluru</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote (India)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Listing Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="active">Active (Visible)</option>
              <option value="expired">Expired</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Compensation */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl border border-slate-800 bg-slate-800/30">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Min Salary (Annual)</label>
            <input
              type="number"
              placeholder="e.g. 1800000"
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Max Salary (Annual)</label>
            <input
              type="number"
              placeholder="e.g. 3500000"
              value={salaryMax}
              onChange={(e) => setSalaryMax(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Currency</label>
            <input
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Required Skills */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Required Skills</label>
          <input
            type="text"
            placeholder="Comma-separated: Python, PostgreSQL, Docker, AWS"
            value={skillsRaw}
            onChange={(e) => setSkillsRaw(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* URLs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Application URL</label>
            <input
              type="url"
              placeholder="https://company.careers/job/123"
              value={applicationUrl}
              onChange={(e) => setApplicationUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Source URL / Proof</label>
            <input
              type="url"
              placeholder="https://linkedin.com/jobs/view/... or careers page"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">
            Job Description <span className="text-emerald-400">*</span>
          </label>
          <textarea
            rows={5}
            required
            placeholder="Detailed job description, responsibilities, requirements, and benefits..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/dashboard/jobs"
            className="px-4 py-2 rounded-xl border border-slate-700 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold hover:brightness-110 transition disabled:opacity-50 shadow-md shadow-emerald-500/20"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Publish Job</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
