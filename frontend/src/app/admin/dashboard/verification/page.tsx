"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Building2,
  Briefcase,
  Clock,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Edit,
  RefreshCw,
  Loader2,
  Sparkles,
  Search,
  MapPin,
  X,
  FileText,
  Check,
  ChevronLeft,
  ChevronRight,
  Building,
  Globe,
  Link2,
} from "lucide-react";
import {
  adminGetVerificationHub,
  adminToggleCompanyVerify,
  adminSetJobStatus,
  adminGetCandidates,
  adminUpdateCandidateVerification,
  adminPromoteCandidate,
} from "@/lib/admin-api";
import {
  AdminVerificationResponse,
  ApiCompany,
  ApiJob,
  CandidateCompanyItem,
  PaginatedCandidatesResponse,
  CandidateVerificationStatus,
} from "@/types/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";

const BENGALURU_LOCALITIES = [
  "All Localities",
  "Peenya",
  "Koramangala",
  "Indiranagar",
  "JP Nagar",
  "HSR Layout",
  "Whitefield",
  "Electronic City",
  "Bellandur",
  "Marathahalli",
  "Malleshwaram",
  "Rajajinagar",
  "Yeshwanthpur",
  "Yelahanka",
  "Kalyan Nagar",
  "Bannerghatta Road",
];

export default function AdminVerificationPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "mca_candidates" | "companies" | "unverified_jobs" | "expired_jobs"
  >("mca_candidates");

  // Legacy Hub Data State
  const [hubData, setHubData] = useState<AdminVerificationResponse | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // MCA Candidates State
  const [candidateData, setCandidateData] = useState<PaginatedCandidatesResponse | null>(null);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [candidatePage, setCandidatePage] = useState<number>(1);
  const [candidateLimit] = useState<number>(20);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterClassification, setFilterClassification] = useState<string>("all");
  const [filterLocality, setFilterLocality] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [excludeRejected, setExcludeRejected] = useState<boolean>(true);

  // Review Drawer / Modal State
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateCompanyItem | null>(null);
  const [reviewStatus, setReviewStatus] = useState<CandidateVerificationStatus>("Needs Review");
  const [reviewWebsite, setReviewWebsite] = useState<string>("");
  const [reviewEvidenceUrl, setReviewEvidenceUrl] = useState<string>("");
  const [reviewOperatingAddress, setReviewOperatingAddress] = useState<string>("");
  const [reviewOperatingLocality, setReviewOperatingLocality] = useState<string>("");
  const [reviewOperatingPincode, setReviewOperatingPincode] = useState<string>("");
  const [reviewNotes, setReviewNotes] = useState<string>("");
  const [submittingReview, setSubmittingReview] = useState<boolean>(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string | null>(null);
  const [reviewErrorMsg, setReviewErrorMsg] = useState<string | null>(null);

  // Promotion state
  const [promotingCin, setPromotingCin] = useState<string | null>(null);
  const [promoteMessage, setPromoteMessage] = useState<string | null>(null);

  // Fetch Candidates Data
  const fetchCandidates = useCallback(async (pageToFetch = candidatePage) => {
    try {
      setCandidatesLoading(true);
      setActionError(null);
      const res = await adminGetCandidates({
        page: pageToFetch,
        limit: candidateLimit,
        status: filterStatus !== "all" ? filterStatus : undefined,
        classification: filterClassification !== "all" ? filterClassification : undefined,
        locality: filterLocality !== "All Localities" && filterLocality.trim() ? filterLocality : undefined,
        search: searchQuery.trim() || undefined,
        exclude_rejected: filterStatus === "all" ? excludeRejected : false,
      });
      setCandidateData(res);
      setCandidatePage(res.page);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to load candidate companies");
    } finally {
      setCandidatesLoading(false);
    }
  }, [candidatePage, candidateLimit, filterStatus, filterClassification, filterLocality, searchQuery, excludeRejected]);

  // Fetch Legacy Hub Data
  const fetchHubData = useCallback(async () => {
    try {
      setActionError(null);
      const res = await adminGetVerificationHub();
      setHubData(res);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to load verification hub data");
    }
  }, []);

  const handlePromoteCandidate = async (cin: string) => {
    try {
      setPromotingCin(cin);
      setActionError(null);
      setPromoteMessage(null);
      const res = await adminPromoteCandidate(cin);
      setPromoteMessage(res.message);
      fetchCandidates(candidatePage);
      fetchHubData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to promote candidate to PostgreSQL";
      setActionError(msg);
      alert(msg);
    } finally {
      setPromotingCin(null);
    }
  };

  useEffect(() => {
    fetchCandidates(1);
    fetchHubData();
  }, [filterStatus, filterClassification, filterLocality, candidateLimit, excludeRejected, fetchCandidates, fetchHubData]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCandidates(1);
  };

  // Open Candidate Review Modal
  const openReviewModal = (candidate: CandidateCompanyItem) => {
    setSelectedCandidate(candidate);
    setReviewStatus(candidate.verification_status);
    setReviewWebsite(candidate.official_website || "");
    setReviewEvidenceUrl(candidate.evidence_url || "");
    setReviewOperatingAddress(candidate.actual_operating_office_address || "");
    setReviewOperatingLocality(candidate.operating_locality || candidate.locality || "");
    setReviewOperatingPincode(candidate.operating_pincode || candidate.postal_code || "");
    setReviewNotes(candidate.reviewer_notes || "");
    setReviewSuccessMsg(null);
    setReviewErrorMsg(null);
  };

  const closeReviewModal = () => {
    setSelectedCandidate(null);
    setReviewSuccessMsg(null);
    setReviewErrorMsg(null);
  };

  // Save Candidate Verification
  const handleSaveVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    try {
      setSubmittingReview(true);
      setReviewErrorMsg(null);
      setReviewSuccessMsg(null);

      const updated = await adminUpdateCandidateVerification(selectedCandidate.cin, {
        verification_status: reviewStatus,
        official_website: reviewWebsite.trim() || null,
        evidence_url: reviewEvidenceUrl.trim() || null,
        actual_operating_office_address: reviewOperatingAddress.trim() || null,
        operating_locality: reviewOperatingLocality.trim() || null,
        operating_pincode: reviewOperatingPincode.trim() || null,
        reviewer_notes: reviewNotes.trim() || null,
      });

      setSelectedCandidate(updated);
      setReviewSuccessMsg(
        `Verification updated to '${reviewStatus}' with evidence saved.`
      );

      // Refresh candidate list in background
      fetchCandidates(candidatePage);
    } catch (err: unknown) {
      setReviewErrorMsg(err instanceof Error ? err.message : "Failed to update candidate verification");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleVerifyCompany = async (company: ApiCompany) => {
    try {
      setProcessingId(company.id);
      setActionError(null);
      await adminToggleCompanyVerify(company.id);
      fetchHubData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to verify company");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReactivateJob = async (job: ApiJob) => {
    try {
      setProcessingId(job.id);
      setActionError(null);
      await adminSetJobStatus(job.id, "active");
      fetchHubData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to reactivate job");
    } finally {
      setProcessingId(null);
    }
  };

  const summary = candidateData?.summary;
  const unverifiedCompanies = hubData?.unverified_companies || [];
  const unverifiedJobs = hubData?.unverified_jobs || [];
  const expiredJobs = hubData?.expired_jobs || [];

  return (
    <div className="space-y-6 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-indigo-400" />
              Company &amp; Listing Verification Hub
            </h2>
            <Badge variant="indigo" size="sm">
              Auditor View
            </Badge>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manual verification workflow for MCA candidate companies, official evidence tracking, and data quality assurance.
          </p>
        </div>
        <Button
          onClick={() => {
            fetchCandidates(candidatePage);
            fetchHubData();
          }}
          variant="secondary"
          size="sm"
          icon={<RefreshCw className="h-3.5 w-3.5" />}
          className="self-start sm:self-auto"
        >
          Refresh All Queues
        </Button>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("mca_candidates")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === "mca_candidates"
              ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Building className="h-4 w-4" />
          <span>MCA Candidate Companies</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 ml-1 font-mono font-bold">
            {summary?.total_candidates ?? 500}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("companies")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === "companies"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Building2 className="h-4 w-4" />
          <span>Production Companies</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 ml-1">
            {unverifiedCompanies.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("unverified_jobs")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === "unverified_jobs"
              ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Briefcase className="h-4 w-4" />
          <span>Unverified Jobs</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 ml-1">
            {unverifiedJobs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("expired_jobs")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
            activeTab === "expired_jobs"
              ? "bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-sm"
              : "text-slate-400 hover:text-white hover:bg-slate-800/60"
          }`}
        >
          <Clock className="h-4 w-4" />
          <span>Expired Jobs</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-300 ml-1">
            {expiredJobs.length}
          </span>
        </button>
      </div>

      {/* ============================================================================== */}
      {/* TAB 1: MCA Candidate Verification Workflow */}
      {/* ============================================================================== */}
      {activeTab === "mca_candidates" && (
        <div className="space-y-6">
          {/* Candidate Verification Summary Cards */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3.5 shadow-md">
                <span className="text-[11px] font-medium text-slate-400 block">Total Pool</span>
                <span className="text-xl font-bold text-white block mt-0.5 font-mono">
                  {summary.total_candidates}
                </span>
                <span className="text-[10px] text-slate-500">MCA Candidates</span>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3.5 shadow-md">
                <span className="text-[11px] font-medium text-amber-300 block">Needs Review</span>
                <span className="text-xl font-bold text-amber-400 block mt-0.5 font-mono">
                  {summary.needs_review_count}
                </span>
                <span className="text-[10px] text-amber-300/80">Pending Action</span>
              </div>

              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 shadow-md">
                <span className="text-[11px] font-medium text-emerald-300 block">Verified</span>
                <span className="text-xl font-bold text-emerald-400 block mt-0.5 font-mono">
                  {summary.verified_count}
                </span>
                <span className="text-[10px] text-emerald-300/80">Evidence Approved</span>
              </div>

              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-3.5 shadow-md">
                <span className="text-[11px] font-medium text-rose-300 block">Rejected</span>
                <span className="text-xl font-bold text-rose-400 block mt-0.5 font-mono">
                  {summary.rejected_count}
                </span>
                <span className="text-[10px] text-rose-300/80">Declined Entities</span>
              </div>

              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 p-3.5 shadow-md">
                <span className="text-[11px] font-medium text-indigo-300 block">Startups</span>
                <span className="text-xl font-bold text-indigo-400 block mt-0.5 font-mono">
                  {summary.startup_count}
                </span>
                <span className="text-[10px] text-indigo-300/80">Tech Classified</span>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3.5 shadow-md">
                <span className="text-[11px] font-medium text-slate-300 block">Office Confirmed</span>
                <span className="text-xl font-bold text-teal-400 block mt-0.5 font-mono">
                  {summary.operating_office_confirmed_count}
                </span>
                <span className="text-[10px] text-slate-400">Premises Verified</span>
              </div>
            </div>
          )}

          {/* Filter Bar */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-4 shadow-xl space-y-3 backdrop-blur-md">
            <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by company name, legal name, CIN, or address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl bg-slate-950/60 border border-slate-700/80 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Status Filter */}
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="rounded-xl bg-slate-950/60 border border-slate-700/80 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="all">All Verification Statuses</option>
                <option value="Needs Review">Needs Review (Default)</option>
                <option value="Verified">Verified Only</option>
                <option value="Rejected">Rejected Only</option>
              </select>

              {/* Classification Filter */}
              <select
                value={filterClassification}
                onChange={(e) => setFilterClassification(e.target.value)}
                className="rounded-xl bg-slate-950/60 border border-slate-700/80 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="all">All Entity Classifications</option>
                <option value="startup">Tech Startups (185)</option>
                <option value="established_company">Established Companies (85)</option>
                <option value="uncertain_for_review">Uncertain for Review (230)</option>
              </select>

              {/* Locality Filter */}
              <select
                value={filterLocality}
                onChange={(e) => setFilterLocality(e.target.value)}
                className="rounded-xl bg-slate-950/60 border border-slate-700/80 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 transition"
              >
                {BENGALURU_LOCALITIES.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                className="justify-center"
              >
                Filter
              </Button>
            </form>

            {/* Archive / Exclude Rejected Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-white select-none">
                <input
                  type="checkbox"
                  checked={excludeRejected}
                  onChange={(e) => setExcludeRejected(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500"
                />
                <span>Exclude Rejected / Ineligible Candidates from Active Queue</span>
              </label>

              {promoteMessage && (
                <span className="text-emerald-400 font-medium inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>{promoteMessage}</span>
                </span>
              )}
            </div>
          </div>

          {/* Candidate Company Table */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
            {candidatesLoading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <Loader2 className="h-7 w-7 text-indigo-400 animate-spin" />
                <span className="text-xs text-slate-400">Loading MCA company candidates...</span>
              </div>
            ) : !candidateData || candidateData.items.length === 0 ? (
              <div className="py-12 px-4">
                {summary && summary.total_candidates === 0 ? (
                  <EmptyState
                    variant="dark"
                    icon={<ShieldCheck className="h-7 w-7 text-indigo-400" />}
                    title="Candidate Verification Queue is Clear"
                    description="All 500 MCA candidate datasets have been safely archived to data/archive. No unverified candidates are currently pending manual review. You can import new company datasets anytime via the Unified Importer."
                    actionLabel="Go to Unified CSV Importer"
                    onAction={() => router.push("/admin/dashboard/imports")}
                    secondaryActionLabel="Refresh Queue"
                    onSecondaryAction={() => fetchCandidates(1)}
                  />
                ) : (
                  <EmptyState
                    variant="dark"
                    icon={<Building className="h-7 w-7 text-slate-400" />}
                    title="No Matching Candidates Found"
                    description="No candidate companies match your active filters. Try adjusting your search query, classification, or corridor filters."
                    actionLabel="Reset Filters"
                    onAction={() => {
                      setSearchQuery("");
                      setFilterStatus("all");
                      setFilterClassification("all");
                      setFilterLocality("All Localities");
                      setExcludeRejected(true);
                    }}
                  />
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4 sm:px-6">Company &amp; CIN</th>
                      <th className="py-3 px-4">Classification</th>
                      <th className="py-3 px-4">Registered Office (MCA)</th>
                      <th className="py-3 px-4">Operating Office</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Review Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70 text-slate-300">
                    {candidateData.items.map((candidate) => {
                      const isStartup = candidate.entity_classification === "startup";
                      const isEstablished = candidate.entity_classification === "established_company";

                      return (
                        <tr key={candidate.cin} className="hover:bg-slate-800/40 transition">
                          {/* Company Name & CIN */}
                          <td className="py-4 px-4 sm:px-6">
                            <div className="font-bold text-white text-sm">{candidate.name}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs" title={candidate.legal_name}>
                              {candidate.legal_name}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="font-mono text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
                                {candidate.cin}
                              </span>
                              {candidate.founded_year && (
                                <span className="text-[10px] text-slate-500">
                                  Est. {candidate.founded_year}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Entity Classification */}
                          <td className="py-4 px-4">
                            <Badge
                              variant={isStartup ? "indigo" : isEstablished ? "secondary" : "warning"}
                              size="sm"
                            >
                              {isStartup
                                ? "Tech Startup"
                                : isEstablished
                                ? "Established Co."
                                : "Needs Review"}
                            </Badge>
                            <div className="text-[10px] text-slate-400 mt-1 max-w-[150px] truncate">
                              {candidate.industry || candidate.mca_sector}
                            </div>
                          </td>

                          {/* Registered Office (MCA) */}
                          <td className="py-4 px-4 max-w-xs">
                            <div className="flex items-start gap-1.5">
                              <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                              <div className="text-[11px] text-slate-300 leading-tight">
                                <span className="font-semibold text-white">{candidate.locality || "Bengaluru"}</span>
                                {candidate.postal_code && (
                                  <span className="text-slate-400 font-mono ml-1">({candidate.postal_code})</span>
                                )}
                                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5" title={candidate.registered_address}>
                                  {candidate.registered_address}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Operating Office */}
                          <td className="py-4 px-4 max-w-xs">
                            {candidate.actual_operating_office_address ? (
                              <div className="text-[11px] text-indigo-300 bg-indigo-500/10 p-2 rounded-xl border border-indigo-500/20">
                                <span className="font-semibold block text-[10px] uppercase text-indigo-400">
                                  Confirmed Premises
                                </span>
                                <span className="line-clamp-1 text-[10px]" title={candidate.actual_operating_office_address}>
                                  {candidate.actual_operating_office_address}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-500 italic">
                                Pending confirmation
                              </span>
                            )}
                          </td>

                          {/* Verification Status */}
                          <td className="py-4 px-4 text-center">
                            <Badge
                              variant={
                                candidate.verification_status === "Verified"
                                  ? "success"
                                  : candidate.verification_status === "Rejected"
                                  ? "danger"
                                  : "warning"
                              }
                              size="sm"
                            >
                              {candidate.verification_status}
                            </Badge>
                          </td>

                          {/* Actions */}
                          <td className="py-4 px-4 text-right">
                            <div className="inline-flex items-center gap-2 justify-end">
                              {candidate.verification_status === "Verified" && (
                                <button
                                  onClick={() => handlePromoteCandidate(candidate.cin)}
                                  disabled={promotingCin === candidate.cin}
                                  title="Promote verified startup into PostgreSQL database"
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600 hover:text-white text-emerald-400 text-xs font-semibold border border-emerald-500/30 transition shadow-sm disabled:opacity-50"
                                >
                                  {promotingCin === candidate.cin ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Sparkles className="h-3.5 w-3.5" />
                                  )}
                                  <span>Promote to DB</span>
                                </button>
                              )}
                              <Button
                                onClick={() => openReviewModal(candidate)}
                                variant="secondary"
                                size="sm"
                                icon={<FileText className="h-3.5 w-3.5 text-indigo-400" />}
                              >
                                Review
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {candidateData && candidateData.total > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-800 bg-slate-950/40 text-xs text-slate-400">
                <div>
                  Showing{" "}
                  <strong className="text-white">
                    {(candidateData.page - 1) * candidateData.limit + 1}
                  </strong>{" "}
                  to{" "}
                  <strong className="text-white">
                    {Math.min(candidateData.page * candidateData.limit, candidateData.total)}
                  </strong>{" "}
                  of <strong className="text-white">{candidateData.total}</strong> candidate companies
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={!candidateData.has_prev || candidatesLoading}
                    onClick={() => fetchCandidates(candidatePage - 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-white font-medium border border-slate-700 transition"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    <span>Previous</span>
                  </button>

                  <span className="font-mono text-slate-300 px-2">
                    Page {candidateData.page} of {candidateData.total_pages}
                  </span>

                  <button
                    disabled={!candidateData.has_next || candidatesLoading}
                    onClick={() => fetchCandidates(candidatePage + 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:hover:bg-slate-800 text-white font-medium border border-slate-700 transition"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* CANDIDATE VERIFICATION MODAL */}
      {/* ============================================================================== */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-200 shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="indigo" size="sm">
                    MCA Candidate Review
                  </Badge>
                  <span className="font-mono text-[10px] text-slate-400">
                    CIN: {selectedCandidate.cin}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white mt-1">
                  {selectedCandidate.name}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedCandidate.legal_name}
                </p>
              </div>

              <button
                onClick={closeReviewModal}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Notifications */}
            {reviewSuccessMsg && (
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>{reviewSuccessMsg}</span>
              </div>
            )}
            {reviewErrorMsg && (
              <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
                <span>{reviewErrorMsg}</span>
              </div>
            )}

            {/* Candidate Metadata Summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] p-3 rounded-xl bg-slate-950/60 border border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px]">Industry:</span>
                <span className="font-semibold text-white">{selectedCandidate.industry || "Technology"}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Incorporated:</span>
                <span className="font-semibold text-white">
                  {selectedCandidate.registration_date || selectedCandidate.founded_year || "Unknown"}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">MCA Status:</span>
                <span className="font-semibold text-emerald-400">{selectedCandidate.company_status}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Classification:</span>
                <span className="font-semibold text-indigo-300 capitalize">
                  {selectedCandidate.entity_classification.replace(/_/g, " ")}
                </span>
              </div>
            </div>

            {/* Address Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Official Registered Office */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
                  <MapPin className="h-3.5 w-3.5 text-amber-400" />
                  <span>Official Registered Office (MCA)</span>
                </div>
                <p className="text-[11px] text-slate-300 bg-slate-900/80 p-2 rounded-lg border border-slate-800 leading-relaxed min-h-[50px]">
                  {selectedCandidate.registered_address}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                  <span>Locality: {selectedCandidate.locality}</span>
                  <span>PIN: {selectedCandidate.postal_code}</span>
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  Coords: {selectedCandidate.latitude.toFixed(4)}°, {selectedCandidate.longitude.toFixed(4)}° ({selectedCandidate.geocoding_source})
                </div>
              </div>

              {/* Confirmed Operating Office */}
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300">
                  <Building2 className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Confirmed Operating Office (Physical)</span>
                </div>
                <p className="text-[11px] text-slate-200 bg-slate-900/80 p-2 rounded-lg border border-indigo-500/30 leading-relaxed min-h-[50px]">
                  {reviewOperatingAddress.trim() || (
                    <span className="text-slate-500 italic">
                      No separate operating office confirmed yet. Enter verified premises below if different from registered address.
                    </span>
                  )}
                </p>
                <div className="flex items-center justify-between text-[10px] text-indigo-400 font-mono">
                  <span>Locality: {reviewOperatingLocality || selectedCandidate.locality}</span>
                  <span>PIN: {reviewOperatingPincode || selectedCandidate.postal_code}</span>
                </div>
              </div>
            </div>

            {/* Review & Evidence Form */}
            <form onSubmit={handleSaveVerification} className="space-y-4">
              {/* Verification Status */}
              <div>
                <label className="block text-xs font-semibold text-white mb-2">
                  Verification Status Decision <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(["Needs Review", "Verified", "Rejected"] as CandidateVerificationStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setReviewStatus(st)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                        reviewStatus === st
                          ? st === "Verified"
                            ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20 font-bold"
                            : st === "Rejected"
                            ? "bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/20 font-bold"
                            : "bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20 font-bold"
                          : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                      }`}
                    >
                      {reviewStatus === st && <Check className="h-3.5 w-3.5" />}
                      <span>{st}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Official Website & Evidence URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Official Website URL
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="url"
                      placeholder="https://company.com"
                      value={reviewWebsite}
                      onChange={(e) => setReviewWebsite(e.target.value)}
                      className="w-full rounded-xl bg-slate-950/60 border border-slate-700 pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Evidence / Verification Proof URL
                  </label>
                  <div className="relative">
                    <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="url"
                      placeholder="LinkedIn, Crunchbase, MCA filing URL..."
                      value={reviewEvidenceUrl}
                      onChange={(e) => setReviewEvidenceUrl(e.target.value)}
                      className="w-full rounded-xl bg-slate-950/60 border border-slate-700 pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Actual Operating Office Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Actual Operating Office Address (Physical Premises)
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter confirmed physical workplace address if different from MCA registered address..."
                  value={reviewOperatingAddress}
                  onChange={(e) => setReviewOperatingAddress(e.target.value)}
                  className="w-full rounded-xl bg-slate-950/60 border border-slate-700 p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Operating Corridor / Locality
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Peenya, Koramangala, HSR..."
                    value={reviewOperatingLocality}
                    onChange={(e) => setReviewOperatingLocality(e.target.value)}
                    className="w-full rounded-xl bg-slate-950/60 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Operating PIN Code
                  </label>
                  <input
                    type="text"
                    placeholder="560xxx"
                    value={reviewOperatingPincode}
                    onChange={(e) => setReviewOperatingPincode(e.target.value)}
                    className="w-full rounded-xl bg-slate-950/60 border border-slate-700 px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono"
                  />
                </div>
              </div>

              {/* Reviewer Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Auditor Review Notes &amp; Rationale
                </label>
                <textarea
                  rows={2}
                  placeholder="Notes regarding corporate verification, active engineering team, online presence, or rejection reason..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full rounded-xl bg-slate-950/60 border border-slate-700 p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
              </div>

              {/* Verification Audit Info */}
              {selectedCandidate.verification_date && (
                <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>
                    Last reviewed by: <strong className="text-white">{selectedCandidate.reviewed_by || "Admin"}</strong>
                  </span>
                  <span>
                    Date: <strong className="text-white">{new Date(selectedCandidate.verification_date).toLocaleString()}</strong>
                  </span>
                </div>
              )}

              {/* Promotion to PostgreSQL Section */}
              {(reviewStatus === "Verified" || selectedCandidate.verification_status === "Verified") && (
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Sparkles className="h-4 w-4 text-emerald-400" />
                      Promote to PostgreSQL Production Map
                    </span>
                    <span className="text-[11px] text-emerald-300 block mt-0.5">
                      Instantly registers this startup and its verified operating office in PostgreSQL.
                    </span>
                  </div>
                  <Button
                    type="button"
                    onClick={() => handlePromoteCandidate(selectedCandidate.cin)}
                    disabled={promotingCin === selectedCandidate.cin}
                    variant="emerald"
                    size="sm"
                    loading={promotingCin === selectedCandidate.cin}
                    icon={<Sparkles className="h-3.5 w-3.5" />}
                    className="shrink-0"
                  >
                    Promote to PostgreSQL
                  </Button>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={closeReviewModal}
                >
                  Close
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={submittingReview}
                  icon={<Check className="h-3.5 w-3.5" />}
                >
                  Save Verification Decision
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* TAB 2: Production Unverified Companies */}
      {/* ============================================================================== */}
      {activeTab === "companies" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
          {unverifiedCompanies.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-1">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-white">All Production Companies Verified</p>
              <p className="text-xs text-slate-400">
                100% of startup organizations in your database are currently marked as verified.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Industry</th>
                  <th className="py-3 px-4">Official Website</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-300">
                {unverifiedCompanies.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-bold text-white text-sm">
                      {c.name}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <Badge variant="secondary" size="sm">
                        {c.industry || "Technology"}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      {c.website || c.website_url ? (
                        <a
                          href={c.website || c.website_url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-400 hover:underline"
                        >
                          <span>{c.website || c.website_url}</span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-slate-500">Not provided</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/admin/dashboard/companies/${c.id}/edit`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Edit Profile"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Link>
                        <Button
                          onClick={() => handleVerifyCompany(c)}
                          variant="emerald"
                          size="sm"
                          loading={processingId === c.id}
                          icon={<CheckCircle2 className="h-3 w-3" />}
                        >
                          Approve
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ============================================================================== */}
      {/* TAB 3: Unverified Jobs */}
      {/* ============================================================================== */}
      {activeTab === "unverified_jobs" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
          {unverifiedJobs.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-1">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-white">All Active Jobs Have Verified Sources</p>
              <p className="text-xs text-slate-400">
                Every job role is backed by an authentic source reference or official career posting.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Role Title</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-300">
                {unverifiedJobs.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-bold text-white text-sm">
                      {j.title}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {j.company?.name || `Company #${j.company_id}`}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="capitalize">{j.employment_type?.replace(/_/g, " ")}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Link href={`/admin/dashboard/jobs/${j.id}/edit`}>
                        <Button variant="secondary" size="sm" icon={<Edit className="h-3 w-3" />}>
                          Add Source Link
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ============================================================================== */}
      {/* TAB 4: Expired Jobs */}
      {/* ============================================================================== */}
      {activeTab === "expired_jobs" && (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
          {expiredJobs.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-1">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <p className="text-sm font-semibold text-white">No Expired Job Postings</p>
              <p className="text-xs text-slate-400">
                There are no job postings past their scheduled expiration window.
              </p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Role Title</th>
                  <th className="py-3 px-4">Company</th>
                  <th className="py-3 px-4">Expiration Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-slate-300">
                {expiredJobs.map((j) => (
                  <tr key={j.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-bold text-white text-sm">
                      {j.title}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {j.company?.name || `Company #${j.company_id}`}
                    </td>
                    <td className="py-3.5 px-4 text-rose-400 font-mono">
                      {j.expires_at ? new Date(j.expires_at).toLocaleDateString() : "Expired"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <Link
                          href={`/admin/dashboard/jobs/${j.id}/edit`}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                          title="Edit Job"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Link>
                        <Button
                          onClick={() => handleReactivateJob(j)}
                          variant="secondary"
                          size="sm"
                          loading={processingId === j.id}
                          icon={<RefreshCw className="h-3 w-3" />}
                        >
                          Reactivate
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
