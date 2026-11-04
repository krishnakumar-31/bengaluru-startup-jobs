"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertCircle, Loader2 } from "lucide-react";
import { adminGetCompany, adminUpdateCompany } from "@/lib/admin-api";
import { CompanyResponse } from "@/types/api";

export default function EditCompanyPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [industry, setIndustry] = useState("FinTech");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [companySize, setCompanySize] = useState("51-200");
  const [foundedYear, setFoundedYear] = useState<number | "">("");
  const [description, setDescription] = useState("");
  const [isVerified, setIsVerified] = useState(true);

  useEffect(() => {
    if (!companyId) return;

    let mounted = true;
    async function loadCompany() {
      try {
        setLoading(true);
        setError(null);
        const data: CompanyResponse = await adminGetCompany(companyId);
        if (!mounted) return;

        setName(data.name || "");
        setSlug(data.slug || "");
        setIndustry(data.industry || "FinTech");
        setWebsite(data.website || data.website_url || "");
        setLogoUrl(data.logo_url || "");
        setCompanySize(data.company_size || "51-200");
        setFoundedYear(data.founded_year || "");
        setDescription(data.description || "");
        setIsVerified(Boolean(data.is_verified));
      } catch (err: unknown) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Failed to load company details");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadCompany();
    return () => {
      mounted = false;
    };
  }, [companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Company name is required.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await adminUpdateCompany(companyId, {
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
      setError(err instanceof Error ? err.message : "Failed to update company");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <Loader2 className="h-7 w-7 text-emerald-400 animate-spin" />
        <p className="text-xs text-slate-400">Loading company details...</p>
      </div>
    );
  }

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
        <h2 className="text-2xl font-bold tracking-tight text-white mt-2">Edit Startup Profile</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Update company metadata, verified status, and branding.
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
              URL Slug
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
            <label className="text-xs font-semibold text-slate-300">Industry</label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="FinTech">FinTech</option>
              <option value="E-commerce">E-commerce</option>
              <option value="Developer Tools">Developer Tools</option>
              <option value="FoodTech / Logistics">FoodTech / Logistics</option>
              <option value="EdTech">EdTech</option>
              <option value="HealthTech">HealthTech</option>
              <option value="AI / ML">AI / ML</option>
              <option value="SaaS">SaaS</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {/* Website */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Official Website URL</label>
            <input
              type="url"
              placeholder="https://company.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Logo URL */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Logo Image URL</label>
            <input
              type="url"
              placeholder="https://company.com/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
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
              <option value="500+">500+ employees</option>
            </select>
          </div>

          {/* Founded Year */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Founded Year</label>
            <input
              type="number"
              placeholder="e.g. 2010"
              min="1990"
              max="2030"
              value={foundedYear}
              onChange={(e) => setFoundedYear(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Verification Status */}
          <div className="space-y-1.5 flex flex-col justify-end">
            <label className="text-xs font-semibold text-slate-300">Verification Status</label>
            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={isVerified}
                onChange={(e) => setIsVerified(e.target.checked)}
                className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-emerald-400 focus:ring-offset-slate-900"
              />
              <span className="text-xs text-slate-300">Marked as Verified Startup</span>
            </label>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Description</label>
          <textarea
            rows={4}
            placeholder="Brief overview of the startup, mission, and products..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/admin/dashboard/companies"
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
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
