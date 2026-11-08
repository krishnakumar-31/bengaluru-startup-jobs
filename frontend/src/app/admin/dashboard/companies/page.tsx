"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Globe,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { CompanyResponse, PaginatedCompaniesResponse } from "@/types/api";
import {
  adminGetCompanies,
  adminToggleCompanyVerify,
  adminDeleteCompany,
} from "@/lib/admin-api";
import { getCompanyInitials } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

export default function AdminCompaniesPage() {
  const [data, setData] = useState<PaginatedCompaniesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [industry, setIndustry] = useState("");
  const [isVerified, setIsVerified] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Deletion modal state
  const [deletingCompany, setDeletingCompany] = useState<CompanyResponse | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminGetCompanies({
        page,
        limit,
        search: search.trim() || undefined,
        industry: industry || undefined,
        is_verified: isVerified === "verified" ? true : isVerified === "unverified" ? false : undefined,
      });
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load companies";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, industry, isVerified]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleToggleVerify = async (companyId: number) => {
    try {
      await adminToggleCompanyVerify(companyId);
      fetchCompanies();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to toggle verification");
    }
  };

  const handleDeleteConfirm = async (force: boolean = false) => {
    if (!deletingCompany) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await adminDeleteCompany(deletingCompany.id, force);
      setDeletingCompany(null);
      fetchCompanies();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete company";
      setDeleteError(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const companies = data?.items || [];
  const total = data?.total || 0;
  const totalPages = data?.total_pages || 1;

  const resetFilters = () => {
    setSearch("");
    setIndustry("");
    setIsVerified("all");
    setPage(1);
  };

  const hasActiveFilters = Boolean(search || industry || isVerified !== "all");

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">Startup Directory</h2>
            <Badge variant="indigo" size="sm">
              {total} registered
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage verified startup profiles, industry classification, websites, and headquarters.
          </p>
        </div>

        <Link href="/admin/dashboard/companies/new">
          <Button variant="primary" size="sm" icon={<Plus className="h-4 w-4" />}>
            Add New Company
          </Button>
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 backdrop-blur-md">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search */}
          <div className="sm:col-span-5 relative flex items-center">
            <Search className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search companies by name or slug..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/60 py-2 pl-10 pr-3 text-xs text-white placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
            />
          </div>

          {/* Industry Filter */}
          <div className="sm:col-span-3">
            <select
              value={industry}
              onChange={(e) => {
                setIndustry(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/60 py-2 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
            >
              <option value="">All Industries</option>
              <option value="FinTech">FinTech</option>
              <option value="Developer Tools">Developer Tools</option>
              <option value="Consumer Tech">Consumer Tech</option>
              <option value="E-Commerce">E-Commerce</option>
              <option value="AI / ML">AI / ML</option>
              <option value="Enterprise SaaS">Enterprise SaaS</option>
              <option value="FoodTech / Logistics">FoodTech / Logistics</option>
              <option value="HealthTech">HealthTech</option>
            </select>
          </div>

          {/* Verification Status */}
          <div className="sm:col-span-3">
            <select
              value={isVerified}
              onChange={(e) => {
                setIsVerified(e.target.value);
                setPage(1);
              }}
              className="w-full rounded-xl border border-slate-700/80 bg-slate-950/60 py-2 px-3 text-xs text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
            >
              <option value="all">All Verification Status</option>
              <option value="verified">Verified Only</option>
              <option value="unverified">Unverified Only</option>
            </select>
          </div>

          {/* Reset Filters */}
          <div className="sm:col-span-1 flex items-center justify-end">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="w-full h-full flex items-center justify-center p-2 rounded-xl border border-slate-700/70 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition text-xs"
                title="Reset filters"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Companies Table Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            <span className="text-xs text-slate-400">Loading companies from PostgreSQL...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-300">
            <AlertCircle className="h-6 w-6 mx-auto mb-2 text-rose-400" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : companies.length === 0 ? (
          <div className="p-8">
            <EmptyState
              variant="dark"
              icon={<Building2 className="h-6 w-6" />}
              title="No companies found"
              description="No registered companies match your filter criteria."
              actionLabel={hasActiveFilters ? "Reset Filters" : "Add First Company"}
              onAction={hasActiveFilters ? resetFilters : () => {}}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase tracking-wider font-semibold">
                  <th className="py-3.5 px-4 sm:px-6">Company</th>
                  <th className="py-3.5 px-4">Industry</th>
                  <th className="py-3.5 px-4">Website</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {companies.map((comp) => (
                  <tr key={comp.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700 text-white font-bold text-xs shadow-inner">
                          {comp.logo_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={comp.logo_url}
                              alt={comp.name}
                              className="h-7 w-7 object-contain rounded"
                              onError={(e) => {
                                (e.currentTarget as HTMLElement).style.display = "none";
                              }}
                            />
                          ) : (
                            getCompanyInitials(comp.name)
                          )}
                        </div>
                        <div>
                          <span className="font-bold text-white text-sm block leading-snug">{comp.name}</span>
                          <span className="text-[11px] font-mono text-slate-400">/{comp.slug}</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <Badge variant="secondary" size="sm">
                        {comp.industry || "General Tech"}
                      </Badge>
                    </td>

                    <td className="py-4 px-4">
                      {comp.website ? (
                        <a
                          href={comp.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-indigo-400 hover:underline transition"
                        >
                          <Globe className="h-3 w-3 text-slate-500" />
                          <span className="truncate max-w-[140px]">
                            {comp.website.replace(/^https?:\/\//, "")}
                          </span>
                          <ExternalLink className="h-2.5 w-2.5 text-slate-500" />
                        </a>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>

                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleToggleVerify(comp.id)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold transition cursor-pointer ${
                          comp.is_verified
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                            : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700"
                        }`}
                        title="Click to toggle verification status"
                      >
                        {comp.is_verified ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            <span>Verified</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 text-slate-500" />
                            <span>Unverified</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          href={`/admin/dashboard/companies/${comp.id}/edit`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Edit Company"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => setDeletingCompany(comp)}
                          className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition"
                          title="Delete Company"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 border-t border-slate-800 text-xs text-slate-400 bg-slate-950/40">
            <span>
              Showing page <strong className="text-white">{page}</strong> of{" "}
              <strong className="text-white">{totalPages}</strong> ({total} total companies)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 disabled:opacity-40 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Protected Deletion Modal */}
      {deletingCompany && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 text-white shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertCircle className="h-6 w-6" />
              <h3 className="text-base font-bold text-white">Delete Company?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to delete <strong>{deletingCompany.name}</strong>?
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-300 space-y-2">
                <p>{deleteError}</p>
                <p className="font-semibold text-amber-200">
                  Do you want to force delete this company and all associated records?
                </p>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteConfirm(true)}
                  disabled={deleteLoading}
                  className="w-full justify-center"
                >
                  Confirm Force Delete
                </Button>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDeletingCompany(null);
                  setDeleteError(null);
                }}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              {!deleteError && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleDeleteConfirm(false)}
                  loading={deleteLoading}
                >
                  Delete Company
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
