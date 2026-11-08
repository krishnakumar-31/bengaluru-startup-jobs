"use client";

import {
  Search,
  MapPin,
  Briefcase,
  ArrowRight,
  Building2,
  Sparkles,
  Compass,
} from "lucide-react";
import { FilterState } from "@/types";

interface HeroSearchProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onSearchSubmit: () => void;
  totalJobsCount: number;
  stats?: {
    total_approved_companies: number;
    total_office_locations: number;
    active_job_openings: number;
    total_vacancies: number;
  } | null;
  loading?: boolean;
}

export function HeroSearch({
  filters,
  onFilterChange,
  onSearchSubmit,
  totalJobsCount,
  stats,
  loading = false,
}: HeroSearchProps) {
  const quickSkills = [
    { label: "Python", query: "Python" },
    { label: "React", query: "React" },
    { label: "Golang", query: "Golang" },
    { label: "TypeScript", query: "TypeScript" },
    { label: "Kubernetes", query: "Kubernetes" },
    { label: "AI / ML", query: "AI" },
    { label: "Next.js", query: "Next.js" },
  ];

  return (
    <section className="relative overflow-hidden bg-[#080D18] text-white pt-14 pb-20 sm:pt-20 sm:pb-24 border-b border-slate-800">
      {/* ========================================================= */}
      {/* 1. PHOTOGRAPHIC BACKGROUND WITH DARK OVERLAY              */}
      {/* ========================================================= */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat animate-hero-bg pointer-events-none"
        style={{
          backgroundImage: "url('/images/bengaluru-tech-office.jpg')",
        }}
      />
      {/* Dark charcoal and black translucent gradient overlay ensuring high contrast */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#080D18]/80 via-[#080D18]/88 to-[#080D18]/96 pointer-events-none" />
      {/* Subtle warm orange & slate atmospheric glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* ========================================================= */}
      {/* 2. HERO CONTENT CONTAINER (CENTERED COMPOSITION)           */}
      {/* ========================================================= */}
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center animate-fade-in-up">
        {/* Small Eyebrow Label */}
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/80 px-4 py-1.5 text-xs font-semibold text-slate-300 backdrop-blur-md shadow-sm mb-6">
          <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
          <span>Explore Bengaluru&apos;s Tech Ecosystem</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12] mb-5">
          Discover Bengaluru&apos;s
          <span className="block mt-1 text-orange-500">
            Startup &amp; Technology Opportunities
          </span>
        </h1>

        {/* Supporting Description */}
        <p className="text-sm sm:text-base lg:text-lg text-[#CBD5E1] font-normal leading-relaxed max-w-2xl mx-auto mb-8">
          Explore technology companies, discover office locations and find exciting job
          opportunities across Bengaluru.
        </p>

        {/* Primary and Secondary CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mb-10">
          <a
            href="#map-section"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg shadow-orange-500/25 hover:bg-orange-600 active:scale-95 transition-all duration-150 cursor-pointer"
          >
            <Compass className="h-4 w-4 text-white" />
            <span>Explore Startup Map</span>
            <ArrowRight className="h-4 w-4 ml-0.5" />
          </a>

          <a
            href="#job-listings"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-6 py-3.5 text-xs sm:text-sm font-bold text-white hover:bg-white/20 hover:border-white/40 active:scale-95 transition-all duration-150 backdrop-blur-sm cursor-pointer"
          >
            <Briefcase className="h-4 w-4 text-slate-300" />
            <span>Browse Jobs</span>
          </a>
        </div>

        {/* ========================================================= */}
        {/* 3. SEARCH INTERFACE                                       */}
        {/* ========================================================= */}
        <div className="max-w-4xl mx-auto mb-14 text-left">
          <div className="rounded-2xl border border-slate-700/80 bg-slate-900/90 p-3.5 sm:p-4 shadow-2xl shadow-black/60 backdrop-blur-xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSearchSubmit();
              }}
              className="grid grid-cols-1 gap-2.5 sm:grid-cols-12 sm:items-center"
            >
              {/* Role / Tech Stack search */}
              <div className="relative sm:col-span-5 flex items-center">
                <Search className="absolute left-3.5 h-4 w-4 text-slate-400 shrink-0 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Job title, keywords, or tech stack..."
                  value={filters.keyword}
                  onChange={(e) =>
                    onFilterChange({ ...filters, keyword: e.target.value })
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/90 py-2.5 pl-10 pr-3 text-xs sm:text-sm text-white placeholder-slate-400 focus:border-orange-500 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500 transition"
                />
              </div>

              {/* Corridor / Locality Select */}
              <div className="relative sm:col-span-4 flex items-center">
                <MapPin className="absolute left-3.5 h-4 w-4 text-orange-400 shrink-0 pointer-events-none" />
                <select
                  value={filters.locality}
                  onChange={(e) =>
                    onFilterChange({ ...filters, locality: e.target.value })
                  }
                  className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-800/90 py-2.5 pl-10 pr-8 text-xs sm:text-sm text-white focus:border-orange-500 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500 transition cursor-pointer"
                >
                  <option value="">All Bengaluru Corridors</option>
                  <option value="Koramangala">Koramangala</option>
                  <option value="Indiranagar">Indiranagar</option>
                  <option value="HSR Layout">HSR Layout</option>
                  <option value="Bellandur">Bellandur / ORR</option>
                  <option value="Whitefield">Whitefield</option>
                  <option value="JP Nagar">JP Nagar</option>
                  <option value="Marathahalli">Marathahalli</option>
                </select>
              </div>

              {/* Employment Type Select */}
              <div className="relative sm:col-span-3 flex items-center">
                <Briefcase className="absolute left-3.5 h-4 w-4 text-slate-400 shrink-0 pointer-events-none" />
                <select
                  value={filters.roleType}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      roleType: e.target.value,
                    })
                  }
                  className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-800/90 py-2.5 pl-10 pr-8 text-xs sm:text-sm text-white focus:border-orange-500 focus:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-orange-500 transition cursor-pointer"
                >
                  <option value="all">All Employment Types</option>
                  <option value="full-time">Full-Time</option>
                  <option value="part-time">Part-Time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>

              {/* Bottom Quick Skills + Submit Action */}
              <div className="sm:col-span-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-800 mt-1">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                  <span className="font-semibold text-slate-300 text-[11px]">Quick Filters:</span>
                  {quickSkills.map((pill) => (
                    <button
                      key={pill.label}
                      type="button"
                      onClick={() =>
                        onFilterChange({ ...filters, keyword: pill.query })
                      }
                      className="rounded-lg bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-300 border border-slate-700/80 transition hover:bg-orange-500 hover:text-white hover:border-orange-500 cursor-pointer"
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-orange-500/25 hover:bg-orange-600 active:scale-95 disabled:opacity-60 transition cursor-pointer"
                >
                  <span>{loading ? "Searching..." : `Search ${totalJobsCount} Roles`}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 4. PLATFORM STATISTICS (COMPACT HORIZONTAL BAR)           */}
        {/* ========================================================= */}
        <div className="pt-6 border-t border-slate-800/80 max-w-4xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
            {/* Metric 1: Verified Companies */}
            <div className="pt-3 sm:pt-0 sm:px-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs mb-1">
                <Building2 className="h-3.5 w-3.5 text-orange-400" />
                <span className="font-semibold uppercase tracking-wider text-[11px]">Verified Companies</span>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
                {stats !== null && stats !== undefined ? stats.total_approved_companies : "—"}
              </div>
            </div>

            {/* Metric 2: Mapped Offices */}
            <div className="pt-3 sm:pt-0 sm:px-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs mb-1">
                <Compass className="h-3.5 w-3.5 text-orange-400" />
                <span className="font-semibold uppercase tracking-wider text-[11px]">Mapped Offices</span>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
                {stats !== null && stats !== undefined ? stats.total_office_locations : "—"}
              </div>
            </div>

            {/* Metric 3: Active Job Openings */}
            <div className="pt-3 sm:pt-0 sm:px-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs mb-1">
                <Briefcase className="h-3.5 w-3.5 text-orange-400" />
                <span className="font-semibold uppercase tracking-wider text-[11px]">Active Job Openings</span>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
                {stats !== null && stats !== undefined ? stats.active_job_openings : "—"}
              </div>
            </div>

            {/* Metric 4: Total Vacancies */}
            <div className="pt-3 sm:pt-0 sm:px-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs mb-1">
                <Sparkles className="h-3.5 w-3.5 text-orange-400" />
                <span className="font-semibold uppercase tracking-wider text-[11px]">Total Vacancies</span>
              </div>
              <div className="text-3xl sm:text-4xl font-extrabold text-white font-mono tracking-tight">
                {stats !== null && stats !== undefined ? stats.total_vacancies : "—"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
