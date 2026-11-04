"use client";

import {
  Search,
  MapPin,
  Briefcase,
  ArrowRight,
} from "lucide-react";
import { FilterState } from "@/types";

interface HeroSearchProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onSearchSubmit: () => void;
  totalJobsCount: number;
  loading?: boolean;
}

export function HeroSearch({
  filters,
  onFilterChange,
  onSearchSubmit,
  totalJobsCount,
  loading = false,
}: HeroSearchProps) {
  const quickPills = [
    { label: "Python", query: "Python" },
    { label: "React", query: "React" },
    { label: "Golang", query: "Golang" },
    { label: "Java", query: "Java" },
    { label: "Kubernetes", query: "Kubernetes" },
    { label: "TypeScript", query: "TypeScript" },
  ];

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-emerald-50/20 to-white pt-12 pb-16 border-b border-slate-100">
      {/* Decorative background grid pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#059669_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.06] pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Hero header */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/90 bg-emerald-100/60 px-3.5 py-1 text-xs font-semibold text-emerald-800 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Bengaluru Tech Corridor Directory</span>
            <span className="text-emerald-500">•</span>
            <span className="text-emerald-700 font-bold">FastAPI + PostgreSQL 18.6 Live</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Discover Startup Opportunities Across{" "}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 bg-clip-text text-transparent">
              Bengaluru
            </span>
          </h1>

          <p className="text-lg text-slate-600 sm:text-xl">
            Explore tech startups by neighborhood corridor—from Koramangala and HSR Layout to
            Indiranagar, Bellandur, and JP Nagar. Find your next role on the map.
          </p>
        </div>

        {/* Search Bar Container */}
        <div className="mt-10 max-w-4xl mx-auto">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-3 shadow-xl shadow-slate-200/50 backdrop-blur-sm">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                onSearchSubmit();
              }}
              className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-center"
            >
              {/* Role / Skill Search */}
              <div className="relative md:col-span-5 flex items-center">
                <Search className="absolute left-3.5 h-5 w-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Job title, tech stack (e.g. Python, React)..."
                  value={filters.keyword}
                  onChange={(e) =>
                    onFilterChange({ ...filters, keyword: e.target.value })
                  }
                  className="w-full rounded-xl border-0 bg-slate-50/80 py-3 pl-11 pr-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Locality Hub Filter */}
              <div className="relative md:col-span-4 flex items-center">
                <MapPin className="absolute left-3.5 h-5 w-5 text-emerald-600" />
                <select
                  value={filters.locality}
                  onChange={(e) =>
                    onFilterChange({ ...filters, locality: e.target.value })
                  }
                  className="w-full appearance-none rounded-xl border-0 bg-slate-50/80 py-3 pl-11 pr-8 text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">All Bengaluru Hubs</option>
                  <option value="Koramangala">Koramangala</option>
                  <option value="Indiranagar">Indiranagar</option>
                  <option value="Bellandur">Bellandur / ORR</option>
                  <option value="JP Nagar">JP Nagar</option>
                  <option value="Marathahalli">Marathahalli</option>
                  <option value="HSR Layout">HSR Layout</option>
                  <option value="Whitefield">Whitefield</option>
                </select>
              </div>

              {/* Employment / Role Type */}
              <div className="relative md:col-span-3 flex items-center">
                <Briefcase className="absolute left-3.5 h-4 w-4 text-slate-400" />
                <select
                  value={filters.roleType}
                  onChange={(e) =>
                    onFilterChange({
                      ...filters,
                      roleType: e.target.value,
                    })
                  }
                  className="w-full appearance-none rounded-xl border-0 bg-slate-50/80 py-3 pl-9 pr-3 text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">All Employment Types</option>
                  <option value="full-time">Full-Time</option>
                  <option value="part-time">Part-Time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </select>
              </div>

              {/* Submit CTA and Quick Filters */}
              <div className="md:col-span-12 flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">Quick Skills:</span>
                  {quickPills.map((pill) => (
                    <button
                      key={pill.label}
                      type="button"
                      onClick={() =>
                        onFilterChange({ ...filters, keyword: pill.query })
                      }
                      className="rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-700 transition hover:bg-emerald-100 hover:text-emerald-800"
                    >
                      {pill.label}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-95 disabled:opacity-60"
                >
                  <span>{loading ? "Searching..." : `Search ${totalJobsCount} Roles`}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Live Ecosystem Stats Bar */}
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4 max-w-4xl mx-auto">
          <div className="rounded-xl border border-slate-200/80 bg-white/70 p-4 text-center backdrop-blur-sm">
            <div className="text-2xl font-bold text-slate-900">8+</div>
            <div className="text-xs font-medium text-slate-500">Startup Corridors</div>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white/70 p-4 text-center backdrop-blur-sm">
            <div className="text-2xl font-bold text-emerald-600">8 Verified</div>
            <div className="text-xs font-medium text-slate-500">PostgreSQL Startups</div>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white/70 p-4 text-center backdrop-blur-sm">
            <div className="text-2xl font-bold text-slate-900">Leaflet Map</div>
            <div className="text-xs font-medium text-slate-500">Verified Coordinates</div>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white/70 p-4 text-center backdrop-blur-sm">
            <div className="text-2xl font-bold text-indigo-600">FastAPI</div>
            <div className="text-xs font-medium text-slate-500">REST API v1</div>
          </div>
        </div>
      </div>
    </section>
  );
}
