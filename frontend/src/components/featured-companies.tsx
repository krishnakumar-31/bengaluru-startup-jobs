"use client";

import React, { useEffect, useState } from "react";
import {
  Building2,
  MapPin,
  Briefcase,
  Search,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";
import { ApiCompany } from "@/types";
import { fetchCompanies } from "@/lib/api";
import { getCompanyInitials } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface FeaturedCompaniesProps {
  onOpenCompanyModal: (companyId: number) => void;
  onSelectCompany: (companyName: string) => void;
}

export function FeaturedCompanies({
  onOpenCompanyModal,
  onSelectCompany,
}: FeaturedCompaniesProps) {
  const [companies, setCompanies] = useState<ApiCompany[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedIndustry, setSelectedIndustry] = useState<string>("all");

  useEffect(() => {
    let mounted = true;
    async function loadCompanies() {
      try {
        setLoading(true);
        const res = await fetchCompanies({ is_verified: true, limit: 12 });
        if (!mounted) return;
        setCompanies(res.items || []);
      } catch (err: unknown) {
        console.error("Could not load featured companies:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadCompanies();
    return () => {
      mounted = false;
    };
  }, []);

  const industries = [
    "all",
    "FinTech",
    "Developer Tools",
    "AI / ML",
    "Enterprise SaaS",
    "E-Commerce",
  ];

  const filteredCompanies = companies.filter((c) => {
    const matchesSearch =
      !searchTerm.trim() ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesIndustry =
      selectedIndustry === "all" ||
      (c.industry && c.industry.toLowerCase().includes(selectedIndustry.toLowerCase()));

    return matchesSearch && matchesIndustry;
  });

  return (
    <section id="featured-companies" className="py-16 bg-slate-50 border-t border-slate-200/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 border border-emerald-200/80 px-3 py-1 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              <span>Verified Ecosystem Directory</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Featured Bengaluru Tech Startups
            </h2>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Explore authentic technology companies with confirmed physical operating premises in Bengaluru.
              Inspect office corridors, open positions, and official corporate credentials.
            </p>
          </div>

          {/* Quick Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search startups..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-56 rounded-xl border border-slate-300 bg-white pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
              />
            </div>

            <select
              value={selectedIndustry}
              onChange={(e) => setSelectedIndustry(e.target.value)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs cursor-pointer"
            >
              <option value="all">All Sectors</option>
              {industries
                .filter((ind) => ind !== "all")
                .map((ind) => (
                  <option key={ind} value={ind}>
                    {ind}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Companies Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div
                key={`loading-company-${i}`}
                className="h-52 rounded-2xl border border-slate-200/80 bg-white p-5 animate-pulse space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-slate-200" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                    <div className="h-3 bg-slate-100 rounded w-1/3" />
                  </div>
                </div>
                <div className="h-10 bg-slate-100 rounded-lg" />
                <div className="h-8 bg-slate-200 rounded-xl w-full" />
              </div>
            ))}
          </div>
        ) : filteredCompanies.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-slate-200 bg-white shadow-xs">
            <Building2 className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-800">No matching startups found</h3>
            <p className="text-xs text-slate-500 mt-1">Try resetting your search query or industry filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredCompanies.map((company) => {
              const officeCount = company.offices?.length || 1;
              const jobCount = company.jobs?.length || 0;

              return (
                <div
                  key={company.id}
                  className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all duration-200 group"
                >
                  <div className="space-y-3">
                    {/* Top Row: Logo & Badges */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white font-bold text-sm shadow-xs border border-slate-800">
                        {company.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={company.logo_url}
                            alt={company.name}
                            className="h-8 w-8 object-contain rounded"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          getCompanyInitials(company.name)
                        )}
                      </div>

                      <Badge variant="indigo" size="sm">
                        {company.industry || "Technology"}
                      </Badge>
                    </div>

                    {/* Company Name & Legal */}
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                          {company.name}
                        </h3>
                        <span title="Verified Presence">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-slate-400">/{company.slug}</span>
                    </div>

                    {/* Description snippet */}
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed min-h-[32px]">
                      {company.description || "Building technology innovations headquartered in Bengaluru."}
                    </p>

                    {/* Stats pill row */}
                    <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1 text-slate-700">
                        <MapPin className="h-3 w-3 text-indigo-600" />
                        <span>{officeCount} {officeCount === 1 ? "Premise" : "Premises"}</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                        <Briefcase className="h-3 w-3 text-emerald-600" />
                        <span>{jobCount} Openings</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4 border-t border-slate-100 flex items-center gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onOpenCompanyModal(company.id)}
                      className="flex-1 justify-center text-slate-700 hover:text-indigo-600 hover:border-indigo-300"
                    >
                      Profile
                    </Button>

                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        onSelectCompany(company.name);
                        const section = document.getElementById("job-listings");
                        if (section) {
                          section.scrollIntoView({ behavior: "smooth" });
                        }
                      }}
                      icon={<ChevronRight className="h-3.5 w-3.5" />}
                      className="flex-1 justify-center"
                    >
                      Jobs
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
