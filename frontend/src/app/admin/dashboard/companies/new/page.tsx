"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { adminCreateCompany } from "@/lib/admin-api";

export default function NewCompanyPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [industry, setIndustry] = useState("FinTech");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [companySize, setCompanySize] = useState("51-200");
  const [foundedYear, setFoundedYear] = useState<number | "">(2020);
  const [description, setDescription] = useState("");
  const [isVerified, setIsVerified] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Company name is required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await adminCreateCompany({
        name: name.trim(),
        slug: slug.trim() || undefined,
        industry: industry || undefined,
        website: website.trim() || undefined,
        logo_url: logoUrl.trim() || undefined,
        company_size: companySize || undefined,
        founded_year: foundedYear ? Number(foundedYear) : undefined,
        description: description.trim() || undefined,
        is_verified: isVerified,
      });

      router.push("/admin/dashboard/companies");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to create company");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      {/* Back button */}
      <div>
        <Link
          href="/admin/dashboard/companies"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Companies</span>
        </Link>
        <h2 className="text-2xl font-bold tracking-tight text-white mt-2">Add New Startup</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Register a verified Bengaluru tech startup into the PostgreSQL database.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Company Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Company Name <span className="text-emerald-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Zerodha"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              URL Slug <span className="text-slate-500">(auto-generated if blank)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. zerodha"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Industry */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Industry Sector</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="FinTech">FinTech</option>
              <option value="Developer Tools">Developer Tools</option>
              <option value="Consumer Tech">Consumer Tech</option>
              <option value="E-Commerce">E-Commerce</option>
              <option value="AI / ML">AI / ML</option>
              <option value="Enterprise SaaS">Enterprise SaaS</option>
              <option value="HealthTech">HealthTech</option>
              <option value="EdTech">EdTech</option>
              <option value="CleanTech">CleanTech</option>
              <option value="DeepTech">DeepTech</option>
            </select>
          </div>

          {/* Company Size */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Company Size</label>
            <select
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="1-10">1-10 employees</option>
              <option value="11-50">11-50 employees</option>
              <option value="51-200">51-200 employees</option>
              <option value="201-500">201-500 employees</option>
              <option value="501-1000">501-1000 employees</option>
              <option value="1001-5000">1001-5000 employees</option>
              <option value="5000+">5000+ employees</option>
            </select>
          </div>

          {/* Official Website */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Official Website URL</label>
            <input
              type="url"
              placeholder="https://zerodha.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Founded Year */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Founded Year</label>
            <input
              type="number"
              min="1990"
              max="2030"
              placeholder="2010"
              value={foundedYear}
              onChange={(e) => setFoundedYear(e.target.value ? Number(e.target.value) : "")}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Logo URL */}
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Company Logo URL (Optional)</label>
            <input
              type="url"
              placeholder="https://example.com/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Description */}
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Company Description</label>
            <textarea
              rows={3}
              placeholder="Brief description of the startup and its core technology offerings..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 p-3 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Verification Status Checkbox */}
          <div className="sm:col-span-2 flex items-center gap-2.5 pt-2">
            <input
              type="checkbox"
              id="is_verified"
              checked={isVerified}
              onChange={(e) => setIsVerified(e.target.checked)}
              className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-600 focus:ring-emerald-500"
            />
            <label htmlFor="is_verified" className="text-xs font-semibold text-slate-300 cursor-pointer">
              Mark as Verified Bengaluru Startup
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Link
            href="/admin/dashboard/companies"
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/25 hover:bg-emerald-500 transition disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            <span>{loading ? "Saving Company..." : "Save Company"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
