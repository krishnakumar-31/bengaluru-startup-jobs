"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertCircle, Building2, Globe, Sparkles } from "lucide-react";
import { adminCreateCompany } from "@/lib/admin-api";
import { Button } from "@/components/ui/button";

export default function NewCompanyPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [cin, setCin] = useState("");
  const [industry, setIndustry] = useState("FinTech");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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
        cin: cin.trim() || undefined,
        industry: industry || undefined,
        website: website.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
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
    <div className="max-w-4xl space-y-6">
      {/* Back button & Header */}
      <div>
        <Link
          href="/admin/dashboard/companies"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-400 transition"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Companies</span>
        </Link>
        <div className="flex items-center gap-3 mt-2">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Add New Startup</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Register a verified Bengaluru tech startup profile in PostgreSQL.
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

      {/* Form Card */}
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 space-y-6 shadow-xl">
        {/* Basic Information */}
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
            <Sparkles className="h-4 w-4 text-indigo-400" />
            Company Identity & Legal Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Company Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Company Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Zerodha"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Slug */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                URL Slug <span className="text-slate-500 font-normal">(auto-generated if blank)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. zerodha"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            {/* CIN */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                MCA CIN <span className="text-slate-500 font-normal">(Corporate Identity Number)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. U72900KA2020PTC123456"
                value={cin}
                onChange={(e) => setCin(e.target.value.toUpperCase())}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Industry */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Industry Sector</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
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
          </div>
        </div>

        {/* Contact & Web Presence */}
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
            <Globe className="h-4 w-4 text-indigo-400" />
            Web & Contact Presence
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Official Website */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Official Website URL</label>
              <input
                type="url"
                placeholder="https://zerodha.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Official Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Contact Email</label>
              <input
                type="email"
                placeholder="careers@zerodha.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Official Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Contact Phone</label>
              <input
                type="text"
                placeholder="+91-80-4040-2020"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Company Size */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Company Size</label>
              <select
                value={companySize}
                onChange={(e) => setCompanySize(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
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
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Logo URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Company Logo URL (Optional)</label>
              <input
                type="url"
                placeholder="https://example.com/logo.png"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Description & Verification */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Company Description</label>
            <textarea
              rows={3}
              placeholder="Brief description of the startup and its core technology offerings..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Verification Status Checkbox */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">Verified Bengaluru Startup</span>
              <span className="text-[11px] text-slate-400">
                Enable to mark this startup as verified and display with the green verification badge.
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isVerified}
                onChange={(e) => setIsVerified(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <Link href="/admin/dashboard/companies">
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            loading={loading}
            icon={<Save className="h-4 w-4" />}
          >
            Save Company
          </Button>
        </div>
      </form>
    </div>
  );
}
