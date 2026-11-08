"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Briefcase,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Plus,
  UploadCloud,
  ChevronRight,
  TrendingUp,
  BarChart3,
  Layers,
  Sparkles,
  RefreshCw,
  Compass,
} from "lucide-react";
import { AdminStatsOverview, AdminChartsResponse } from "@/types/api";
import { adminGetStats, adminGetCharts } from "@/lib/admin-api";
import { formatSalaryRange, getCompanyInitials } from "@/lib/formatters";
import { useAdminAuth } from "@/lib/admin-auth";

export default function AdminDashboardOverviewPage() {
  const { admin, isLoading: authLoading } = useAdminAuth();
  const [stats, setStats] = useState<AdminStatsOverview | null>(null);
  const [charts, setCharts] = useState<AdminChartsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, chartsData] = await Promise.all([
        adminGetStats(),
        adminGetCharts(),
      ]);
      setStats(statsData);
      setCharts(chartsData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load dashboard overview";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!admin) return;
    loadData();
  }, [admin, authLoading, loadData]);

  // Defensive consolidation for jobs by status to guarantee stable, unique keys
  const consolidatedJobsByStatus = React.useMemo(() => {
    if (!charts?.jobs_by_status) return [];
    const map = new Map<string, (typeof charts.jobs_by_status)[0]>();
    for (const item of charts.jobs_by_status) {
      const normalizedKey = item.label.trim().toLowerCase();
      const existing = map.get(normalizedKey);
      if (existing) {
        existing.count += item.count;
        existing.percentage = Math.round((existing.percentage + item.percentage) * 10) / 10;
      } else {
        const formattedLabel =
          item.label.charAt(0).toUpperCase() + item.label.slice(1).toLowerCase();
        map.set(normalizedKey, { ...item, label: formattedLabel });
      }
    }
    return Array.from(map.values());
  }, [charts]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-800 rounded-lg w-48 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={`kpi-skeleton-${n}`} className="h-28 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
          <div className="h-72 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-8 text-center text-rose-300">
        <AlertCircle className="h-8 w-8 mx-auto text-rose-400 mb-2" />
        <h3 className="text-base font-bold text-white">Dashboard Overview Error</h3>
        <p className="text-xs text-rose-300 mt-1">{error || "Failed to load statistics."}</p>
        <button
          onClick={loadData}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Retry Connection</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl font-sans">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-400 mb-1.5">
            <Sparkles className="h-3 w-3" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Ecosystem Overview
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Live telemetry for Bengaluru tech startups, plotted premises, and verified roles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/admin/dashboard/companies/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Company</span>
          </Link>
          <Link
            href="/admin/dashboard/jobs/new"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Vacancy</span>
          </Link>
          <Link
            href="/admin/dashboard/imports"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition cursor-pointer"
          >
            <UploadCloud className="h-3.5 w-3.5 text-indigo-400" />
            <span>Import CSV</span>
          </Link>
        </div>
      </div>

      {/* 4 Primary KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Companies */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md relative overflow-hidden group hover:border-slate-700 transition shadow-lg shadow-slate-950/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Startups</p>
              <h3 className="text-3xl font-black text-white mt-1 font-mono">{stats.total_companies}</h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-semibold">
              <CheckCircle2 className="h-3 w-3" />
              {stats.verified_companies} Verified
            </span>
            <span>•</span>
            <span>{stats.unverified_companies} Pending</span>
          </div>
        </div>

        {/* Total Offices */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md relative overflow-hidden group hover:border-slate-700 transition shadow-lg shadow-slate-950/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Plotted Offices</p>
              <h3 className="text-3xl font-black text-emerald-400 mt-1 font-mono">{stats.total_offices}</h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Compass className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-[11px] text-slate-400 flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">100% Geo-Validated</span>
            <span>in Greater Bengaluru</span>
          </div>
        </div>

        {/* Total Jobs */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md relative overflow-hidden group hover:border-slate-700 transition shadow-lg shadow-slate-950/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Open Roles</p>
              <h3 className="text-3xl font-black text-white mt-1 font-mono">{stats.total_jobs}</h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              <Briefcase className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-400">
            <span className="text-indigo-400 font-semibold">{stats.active_jobs} Active</span>
            <span>•</span>
            <span className="text-slate-500">{stats.expired_jobs} Expired</span>
          </div>
        </div>

        {/* Unverified Vacancies */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 backdrop-blur-md relative overflow-hidden group hover:border-slate-700 transition shadow-lg shadow-slate-950/20">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Verification Backlog</p>
              <h3 className="text-3xl font-black text-amber-400 mt-1 font-mono">
                {stats.unverified_jobs + stats.unverified_companies}
              </h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertCircle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 text-[11px] text-amber-400 font-medium">
            <Link href="/admin/dashboard/verification" className="hover:underline flex items-center gap-1">
              <span>Review candidate queue</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>

      {/* Analytics Charts Section */}
      {charts && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Companies by Industry Breakdown */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md space-y-4 shadow-lg shadow-slate-950/20">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Companies by Industry</h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">PostgreSQL distribution</span>
            </div>

            <div className="space-y-3">
              {charts.companies_by_industry.map((item) => (
                <div key={`company-ind-${item.label}`} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">{item.label}</span>
                    <span className="text-slate-400 font-mono">
                      {item.count} ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Jobs by Locality Corridor */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md space-y-4 shadow-lg shadow-slate-950/20">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Jobs by Tech Corridor</h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">Bengaluru clusters</span>
            </div>

            <div className="space-y-3">
              {charts.jobs_by_locality.map((item) => (
                <div key={`job-loc-${item.label}`} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">{item.label}</span>
                    <span className="text-slate-400 font-mono">
                      {item.count} roles ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Active vs Expired Status Proportion */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md space-y-4 shadow-lg shadow-slate-950/20">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-teal-400" />
                <h3 className="text-sm font-bold text-white">Job Status Distribution</h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">Active vs Expired</span>
            </div>

            <div className="flex items-center gap-4 py-2">
              <div className="flex-1 space-y-3">
                {consolidatedJobsByStatus.map((item) => {
                  const color =
                    item.label.toLowerCase() === "active"
                      ? "bg-emerald-500"
                      : item.label.toLowerCase() === "expired"
                      ? "bg-amber-500"
                      : "bg-slate-600";
                  return (
                    <div key={`job-status-${item.label.toLowerCase()}`} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-300">{item.label}</span>
                        <span className="text-slate-400 font-mono">
                          {item.count} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${color}`}
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Jobs by Industry */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md space-y-4 shadow-lg shadow-slate-950/20">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Roles by Industry Sector</h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">Talent demand</span>
            </div>

            <div className="space-y-3">
              {charts.jobs_by_industry.map((item) => (
                <div key={`job-ind-${item.label}`} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-300">{item.label}</span>
                    <span className="text-slate-400 font-mono">
                      {item.count} roles ({item.percentage}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Companies */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md space-y-4 shadow-lg shadow-slate-950/20">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">Recently Added Companies</h3>
            <Link
              href="/admin/dashboard/companies"
              className="text-xs font-semibold text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {stats.recent_companies.map((comp) => {
              const initials = getCompanyInitials(comp.name);
              return (
                <div
                  key={`recent-comp-${comp.id}`}
                  className="flex items-center justify-between p-3 rounded-xl border border-slate-800/80 bg-slate-950/60 hover:border-slate-700 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 flex items-center justify-center text-xs font-bold shrink-0">
                      {initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{comp.name}</span>
                        {comp.is_verified && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">{comp.industry || "Technology"}</span>
                    </div>
                  </div>
                  <Link
                    href={`/admin/dashboard/companies/${comp.id}/edit`}
                    className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
                  >
                    Edit
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Jobs */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 backdrop-blur-md space-y-4 shadow-lg shadow-slate-950/20">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">Recently Posted Vacancies</h3>
            <Link
              href="/admin/dashboard/jobs"
              className="text-xs font-semibold text-indigo-400 hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ChevronRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-2">
            {stats.recent_jobs.map((job) => (
              <div
                key={`recent-job-${job.id}`}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-800/80 bg-slate-950/60 hover:border-slate-700 transition"
              >
                <div>
                  <div className="text-xs font-bold text-white">{job.title}</div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span>{job.company?.name || "Startup"}</span>
                    <span>•</span>
                    <span className="font-mono text-emerald-400">
                      {formatSalaryRange(job.salary_min, job.salary_max, job.currency || "INR")}
                    </span>
                  </div>
                </div>
                <Link
                  href={`/admin/dashboard/jobs/${job.id}/edit`}
                  className="rounded-lg bg-slate-800 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:bg-slate-700 hover:text-white transition"
                >
                  Edit
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
