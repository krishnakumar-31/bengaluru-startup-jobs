"use client";

import { useState, useEffect } from "react";
import { Navbar } from "@/components/navbar";
import { HeroSearch } from "@/components/hero-search";
import { MapSection } from "@/components/map-section";
import { JobListings } from "@/components/job-listings";
import { CompanyModal } from "@/components/company-modal";
import { Footer } from "@/components/footer";
import { ApiJob, ApiJobMap, FilterState, GroupedOfficeLocation, MCAPreviewCompany, PaginatedResponse } from "@/types";
import { fetchJobs, fetchMapJobs, fetchMcaPreviewCompanies } from "@/lib/api";

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

  // Jobs state
  const [jobsData, setJobsData] = useState<PaginatedResponse<ApiJob> | null>(null);
  const [jobsLoading, setJobsLoading] = useState<boolean>(true);
  const [jobsError, setJobsError] = useState<string | null>(null);
  const [jobsFetchTrigger, setJobsFetchTrigger] = useState<number>(0);

  // Map state
  const [mapJobs, setMapJobs] = useState<ApiJobMap[]>([]);
  const [mapLoading, setMapLoading] = useState<boolean>(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapFetchTrigger, setMapFetchTrigger] = useState<number>(0);

  // MCA Preview state (100-batch test vs 20-batch)
  const [mcaCompanies, setMcaCompanies] = useState<MCAPreviewCompany[]>([]);
  const [mcaBatch, setMcaBatch] = useState<number>(100);
  const [mcaLoading, setMcaLoading] = useState<boolean>(true);
  const [mcaError, setMcaError] = useState<string | null>(null);

  // Modal state
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);

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

  // Load map jobs asynchronously
  useEffect(() => {
    let isCancelled = false;

    fetchMapJobs({
      locality: filters.locality.trim() || undefined,
      search: filters.keyword.trim() || undefined,
    })
      .then((data) => {
        if (!isCancelled) {
          setMapJobs(data);
          setMapError(null);
          setMapLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          const message = err instanceof Error ? err.message : "Failed to load map coordinates";
          setMapError(message);
          setMapLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [filters.locality, filters.keyword, mapFetchTrigger]);

  // Load MCA preview companies asynchronously (read-only CSV visualization)
  useEffect(() => {
    let isCancelled = false;

    fetchMcaPreviewCompanies({
      locality: filters.locality.trim() || undefined,
      batch: mcaBatch,
    })
      .then((data) => {
        if (!isCancelled) {
          setMcaCompanies(data);
          setMcaError(null);
          setMcaLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          const message = err instanceof Error ? err.message : "Failed to load MCA preview companies";
          setMcaError(message);
          setMcaLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [filters.locality, mcaBatch, mapFetchTrigger]);

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

  const handleSelectOffice = (office: GroupedOfficeLocation | null) => {
    if (office?.locality) {
      handleFilterChange({
        ...filters,
        locality: office.locality,
      });
      const section = document.getElementById("job-listings");
      if (section) {
        section.scrollIntoView({ behavior: "smooth" });
      }
    }
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
          loading={jobsLoading}
        />

        <MapSection
          mapJobs={mapJobs}
          mcaCompanies={mcaCompanies}
          mcaBatch={mcaBatch}
          onSelectBatch={(b) => {
            setMcaBatch(b);
            setMcaLoading(true);
          }}
          loading={mapLoading}
          mcaLoading={mcaLoading}
          error={mapError || mcaError}
          selectedLocality={filters.locality}
          onSelectLocality={handleSelectLocality}
          onSelectOffice={handleSelectOffice}
          onOpenCompanyModal={(id) => setSelectedCompanyId(id)}
          onRetry={() => {
            setMapLoading(true);
            setMcaLoading(true);
            setMapFetchTrigger((c) => c + 1);
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
    </div>
  );
}
