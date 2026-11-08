"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { HeroSearch } from "@/components/hero-search";
import { MapSection } from "@/components/map-section";
import { JobListings } from "@/components/job-listings";
import { FeaturedCompanies } from "@/components/featured-companies";
import { CompanyModal } from "@/components/company-modal";
import { JobDetailModal } from "@/components/job-detail-modal";
import { Footer } from "@/components/footer";
import {
  ApiJob,
  FilterState,
  PaginatedResponse,
  PublicStatsResponse,
  OfficeLocationMapResponse,
} from "@/types";
import { fetchJobs, fetchPublicStats, fetchMapLocations } from "@/lib/api";

export default function Home() {
  const [filters, setFilters] = useState<FilterState>({
    keyword: "",
    locality: "",
    roleType: "all",
    workplaceType: "all",
    experienceLevel: "all",
    skills: "",
    company: "",
  });

  const [page, setPage] = useState<number>(1);
  const limit = 6;

  // Homepage Database-Backed Statistics
  const [stats, setStats] = useState<PublicStatsResponse | null>(null);

  // Jobs state
  const [jobsData, setJobsData] = useState<PaginatedResponse<ApiJob> | null>(null);
  const [jobsLoading, setJobsLoading] = useState<boolean>(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [jobsFetchTrigger, setJobsFetchTrigger] = useState<number>(0);

  // Map state (Approved company locations from PostgreSQL)
  const [mapLocations, setMapLocations] = useState<OfficeLocationMapResponse[]>([]);
  const [mapLoading, setMapLoading] = useState<boolean>(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapFetchTrigger, setMapFetchTrigger] = useState<number>(0);

  // Modal state
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedJobForDetail, setSelectedJobForDetail] = useState<ApiJob | null>(null);

  // Load live database-backed statistics on mount and retry
  useEffect(() => {
    let isCancelled = false;

    fetchPublicStats()
      .then((data) => {
        if (!isCancelled) {
          setStats(data);
        }
      })
      .catch((err: unknown) => {
        console.error("Could not load public stats:", err);
      });

    return () => {
      isCancelled = true;
    };
  }, [jobsFetchTrigger]);

  // Load paginated jobs asynchronously
  useEffect(() => {
    let isCancelled = false;

    fetchJobs({
      page,
      limit,
      search: filters.keyword.trim() || undefined,
      locality: filters.locality.trim() || undefined,
      employment_type: filters.roleType !== "all" ? filters.roleType : undefined,
      experience_level: filters.experienceLevel !== "all" ? filters.experienceLevel : undefined,
      skills: filters.skills.trim() || undefined,
      company: filters.company.trim() || undefined,
    })
      .then((data) => {
        if (!isCancelled) {
          setJobsData(data);
          setJobsError(null);
          setJobsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          const message = err instanceof Error ? err.message : "Failed to connect to backend jobs API";
          setJobsError(message);
          setJobsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [page, limit, filters, jobsFetchTrigger]);

  // Load approved office locations for the interactive map
  useEffect(() => {
    let isCancelled = false;

    fetchMapLocations({
      locality: filters.locality.trim() || undefined,
      search: filters.keyword.trim() || undefined,
      skills: filters.skills.trim() || undefined,
    })
      .then((data) => {
        if (!isCancelled) {
          setMapLocations(data);
          setMapError(null);
          setMapLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          const message = err instanceof Error ? err.message : "Failed to load approved map coordinates";
          setMapError(message);
          setMapLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [filters.locality, filters.keyword, filters.skills, mapFetchTrigger]);

  // Filter change handler that resets pagination
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setPage(1);
    setJobsLoading(true);
    setMapLoading(true);
  };

  const handleSelectLocality = (locality: string) => {
    handleFilterChange({
      ...filters,
      locality,
    });
  };

  const handleResetFilters = () => {
    handleFilterChange({
      keyword: "",
      locality: "",
      roleType: "all",
      workplaceType: "all",
      experienceLevel: "all",
      skills: "",
      company: "",
    });
  };

  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const handleSelectOffice = (_loc: OfficeLocationMapResponse | null) => {
    // Keep the user focused on the map so they can inspect the popup details smoothly
  };

  const handleSearchSubmit = () => {
    const section = document.getElementById("job-listings");
    if (section) {
      section.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />

      <main className="flex-1">
        <HeroSearch
          filters={filters}
          onFilterChange={handleFilterChange}
          onSearchSubmit={handleSearchSubmit}
          totalJobsCount={jobsData?.total ?? 0}
          stats={stats}
          loading={jobsLoading}
        />

        <MapSection
          locations={mapLocations}
          loading={mapLoading}
          error={mapError}
          selectedLocality={filters.locality}
          onSelectLocality={handleSelectLocality}
          onSelectOffice={handleSelectOffice}
          onOpenCompanyModal={(id) => setSelectedCompanyId(id)}
          onRetry={() => {
            setMapLoading(true);
            setMapFetchTrigger((c) => c + 1);
          }}
        />

        <FeaturedCompanies
          onOpenCompanyModal={(id) => setSelectedCompanyId(id)}
          onSelectCompany={(companyName) => {
            handleFilterChange({
              ...filters,
              company: companyName,
            });
          }}
        />

        <JobListings
          jobsData={jobsData}
          loading={jobsLoading}
          error={jobsError}
          filters={filters}
          currentPage={page}
          onPageChange={(p) => {
            setPage(p);
            setJobsLoading(true);
          }}
          onResetFilters={handleResetFilters}
          onOpenCompanyModal={(id) => setSelectedCompanyId(id)}
          onSelectLocality={handleSelectLocality}
          onViewJobDetail={(job) => setSelectedJobForDetail(job)}
          onRetry={() => {
            setJobsLoading(true);
            setJobsFetchTrigger((c) => c + 1);
          }}
        />
      </main>

      <Footer />

      {/* Reusable Company Details Modal */}
      <CompanyModal
        companyId={selectedCompanyId}
        onClose={() => setSelectedCompanyId(null)}
      />

      {/* Reusable Job Detail Modal */}
      <JobDetailModal
        job={selectedJobForDetail}
        onClose={() => setSelectedJobForDetail(null)}
        onOpenCompanyModal={(id) => {
          setSelectedJobForDetail(null);
          setSelectedCompanyId(id);
        }}
      />
    </div>
  );
}
