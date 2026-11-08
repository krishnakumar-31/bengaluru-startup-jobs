"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  AlertCircle,
  Loader2,
  MapPin,
  Briefcase,
  Plus,
  ExternalLink,
  Building2,
  Globe,
  Sparkles,
} from "lucide-react";
import { adminGetCompany, adminUpdateCompany } from "@/lib/admin-api";
import { CompanyResponse } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function EditCompanyPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [companyData, setCompanyData] = useState<CompanyResponse | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [cin, setCin] = useState("");
  const [industry, setIndustry] = useState("FinTech");
  const [website, setWebsite] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
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

        setCompanyData(data);
        setName(data.name || "");
        setSlug(data.slug || "");
        setCin(data.cin || "");
        setIndustry(data.industry || "FinTech");
        setWebsite(data.website || data.website_url || "");
        setEmail(data.email || "");
        setPhone(data.phone || "");
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
      setError(err instanceof Error ? err.message : "Failed to update company");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] space-y-3">
        <Loader2 className="h-7 w-7 text-indigo-400 animate-spin" />
        <p className="text-xs text-slate-400">Loading company details...</p>
      </div>
    );
  }

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
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-white">{name || "Edit Startup"}</h2>
              {isVerified ? (
                <Badge variant="success" size="sm">
                  Verified
                </Badge>
              ) : (
                <Badge variant="secondary" size="sm">
                  Unverified
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Update company profile metadata, official links, and verified status.
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
        {/* Identity & Legal */}
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
              <label className="text-xs font-semibold text-slate-300">URL Slug</label>
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
              <label className="text-xs font-semibold text-slate-300">Industry</label>
              <select
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              >
                <option value="FinTech">FinTech</option>
                <option value="E-commerce">E-commerce</option>
                <option value="Developer Tools">Developer Tools</option>
                <option value="FoodTech / Logistics">FoodTech / Logistics</option>
                <option value="EdTech">EdTech</option>
                <option value="HealthTech">HealthTech</option>
                <option value="AI / ML">AI / ML</option>
                <option value="Enterprise SaaS">Enterprise SaaS</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact & Web */}
        <div>
          <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
            <Globe className="h-4 w-4 text-indigo-400" />
            Contact & Web Presence
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Website */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Official Website URL</label>
              <input
                type="url"
                placeholder="https://company.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Contact Email</label>
              <input
                type="email"
                placeholder="careers@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Contact Phone</label>
              <input
                type="text"
                placeholder="+91-80-..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
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
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Description & Verification */}
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Description</label>
            <textarea
              rows={4}
              placeholder="Brief overview of the startup, mission, and products..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950/60 p-3 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white block">Verified Bengaluru Startup</span>
              <span className="text-[11px] text-slate-400">
                Marking this company verified enables display with the green verification badge on public views.
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

        {/* Buttons */}
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
            loading={saving}
            icon={<Save className="h-4 w-4" />}
          >
            Save Changes
          </Button>
        </div>
      </form>

      {/* Associated Offices Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Associated Bengaluru Offices</h3>
            <Badge variant="secondary" size="sm">
              {companyData?.offices?.length || 0}
            </Badge>
          </div>
          <Link href="/admin/dashboard/offices">
            <Button variant="secondary" size="sm" icon={<Plus className="h-3.5 w-3.5" />}>
              Manage Offices
            </Button>
          </Link>
        </div>

        {companyData?.offices && companyData.offices.length > 0 ? (
          <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 overflow-hidden bg-slate-950/40">
            {companyData.offices.map((off) => (
              <div key={off.id} className="p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-xs">{off.name || off.locality || "Office"}</span>
                    {off.is_headquarters && (
                      <Badge variant="indigo" size="sm">
                        HQ
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {off.address || off.locality}, {off.city} {off.postal_code ? `- ${off.postal_code}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-mono text-slate-400">
                    {off.latitude ? `${off.latitude.toFixed(4)}, ${off.longitude?.toFixed(4)}` : "No coords"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic py-2">
            No offices registered yet. Add an office location to show this startup on the Bengaluru map.
          </p>
        )}
      </div>

      {/* Associated Jobs Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Associated Job Vacancies</h3>
            <Badge variant="secondary" size="sm">
              {companyData?.jobs?.length || 0}
            </Badge>
          </div>
          <Link href="/admin/dashboard/jobs/new">
            <Button variant="primary" size="sm" icon={<Plus className="h-3.5 w-3.5" />}>
              Post New Job
            </Button>
          </Link>
        </div>

        {companyData?.jobs && companyData.jobs.length > 0 ? (
          <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 overflow-hidden bg-slate-950/40">
            {companyData.jobs.map((job) => (
              <div key={job.id} className="p-3.5 flex items-center justify-between hover:bg-slate-800/40 transition">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white text-xs">{job.title}</span>
                    <Badge variant={job.status === "active" ? "success" : "secondary"} size="sm">
                      {job.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {job.work_mode || job.employment_type} • {job.vacancies || 1}{" "}
                    {job.vacancies === 1 ? "vacancy" : "vacancies"}
                  </p>
                </div>
                <Link
                  href={`/admin/dashboard/jobs/${job.id}/edit`}
                  className="text-xs text-indigo-400 hover:text-indigo-300 hover:underline inline-flex items-center gap-1 transition"
                >
                  <span>Edit</span>
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic py-2">
            No active job openings currently listed for this company.
          </p>
        )}
      </div>
    </div>
  );
}
