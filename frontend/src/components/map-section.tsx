"use client";

import { useState } from "react";
import {
  MapPin,
  Layers,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Building2,
  Layers3,
} from "lucide-react";
import { ApiJobMap, GroupedOfficeLocation, MCAPreviewCompany } from "@/types";
import { InteractiveMap } from "@/components/interactive-map";

interface MapSectionProps {
  mapJobs: ApiJobMap[];
  mcaCompanies?: MCAPreviewCompany[];
  mcaBatch?: number;
  onSelectBatch?: (batch: number) => void;
  loading: boolean;
  mcaLoading?: boolean;
  error?: string | null;
  selectedLocality: string;
  onSelectLocality: (locality: string) => void;
  onSelectOffice?: (office: GroupedOfficeLocation | null) => void;
  onOpenCompanyModal?: (companyId: number) => void;
  onRetry?: () => void;
}

const BENGALURU_CORRIDORS = [
  { id: "", label: "All Corridors" },
  { id: "Koramangala", label: "Koramangala" },
  { id: "Indiranagar", label: "Indiranagar" },
  { id: "JP Nagar", label: "JP Nagar" },
  { id: "HSR Layout", label: "HSR Layout" },
  { id: "Bellandur", label: "Bellandur / ORR" },
  { id: "Whitefield", label: "Whitefield" },
  { id: "Peenya", label: "Peenya Industrial" },
  { id: "Malleshwaram", label: "Malleshwaram" },
  { id: "Yelahanka", label: "Yelahanka" },
];

export function MapSection({
  mapJobs = [],
  mcaCompanies = [],
  mcaBatch = 100,
  onSelectBatch,
  loading = false,
  mcaLoading = false,
  error,
  selectedLocality,
  onSelectLocality,
  onSelectOffice,
  onOpenCompanyModal,
  onRetry,
}: MapSectionProps) {
  const [tileStyle, setTileStyle] = useState<"carto" | "osm">("carto");
  const [layerMode, setLayerMode] = useState<"all" | "mca" | "jobs">("all");

  // Calculate unique office locations
  const uniqueOfficesCount = new Set(mapJobs.map((j) => j.office_id)).size;
  const mcaCount = mcaCompanies.length;
  const totalPinsCount = (layerMode === "mca" ? 0 : uniqueOfficesCount) + (layerMode === "jobs" ? 0 : mcaCount);

  const showMcaLayer = layerMode === "all" || layerMode === "mca";
  const showJobsLayer = layerMode === "all" || layerMode === "jobs";

  return (
    <section id="map-section" className="scroll-mt-20 py-12 bg-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Bengaluru Geographic Engine (Leaflet + OpenStreetMap)</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-500/10 px-3 py-1 text-xs font-semibold text-teal-300">
                <Building2 className="h-3.5 w-3.5" />
                <span>MCA Batch {mcaBatch} Active ({mcaCount} Candidates)</span>
              </div>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Startup Corridors &amp; Office Locations Map
            </h2>
            <p className="mt-1 text-sm text-slate-400 max-w-2xl">
              Explore verified startup headquarters and registered MCA candidate startups across Greater Bengaluru.
              Click any pin to inspect verified addresses, geocoding precision, and open engineering roles.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">Base Center:</span>
            <code className="rounded bg-slate-800 px-2 py-1 text-xs text-emerald-400 font-mono">
              12.9716° N, 77.5946° E (Bengaluru)
            </code>
          </div>
        </div>

        {/* Corridor Quick Filter Buttons */}
        <div id="tech-hubs" className="mb-4 flex flex-wrap items-center gap-2">
          {BENGALURU_CORRIDORS.map((corridor) => {
            const isCurrent =
              selectedLocality.toLowerCase() === corridor.id.toLowerCase();
            return (
              <button
                key={corridor.id}
                onClick={() => onSelectLocality(corridor.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
                  isCurrent
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30"
                    : "bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white"
                }`}
              >
                {corridor.id && <MapPin className="h-3 w-3 text-emerald-400" />}
                <span>{corridor.label}</span>
              </button>
            );
          })}
        </div>

        {/* Map Viewport Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950 shadow-2xl">
          {/* Top Floating Controls */}
          <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
            {/* Layer Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900/95 p-1 text-xs backdrop-blur-md shadow-lg">
              <button
                onClick={() => setLayerMode("all")}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition font-medium ${
                  layerMode === "all"
                    ? "bg-emerald-600 text-white font-bold shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Layers3 className="h-3.5 w-3.5" />
                <span>All Pins ({uniqueOfficesCount + mcaCount})</span>
              </button>

              <button
                onClick={() => setLayerMode("mca")}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition font-medium ${
                  layerMode === "mca"
                    ? "bg-emerald-500 text-slate-950 font-bold shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
                <span>MCA Candidates ({mcaCount})</span>
              </button>

              <button
                onClick={() => setLayerMode("jobs")}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 transition font-medium ${
                  layerMode === "jobs"
                    ? "bg-violet-600 text-white font-bold shadow-sm"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                <span className="flex h-2 w-2 rounded-full bg-violet-400"></span>
                <span>Active Job Offices ({uniqueOfficesCount})</span>
              </button>
            </div>

            {/* Batch Dataset Selection (Requirement 11) */}
            <div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/95 p-1 text-xs backdrop-blur-md shadow-lg">
              <span className="text-[10px] text-slate-400 px-1 font-mono uppercase">Batch:</span>
              <button
                onClick={() => onSelectBatch?.(100)}
                className={`rounded-lg px-2 py-1 transition text-xs font-semibold ${
                  mcaBatch === 100
                    ? "bg-teal-500 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
                title="100 Batch Test (77 Valid Candidates, 20 Duplicates Excluded, 3 Failures Excluded)"
              >
                100 Batch (77)
              </button>
              <button
                onClick={() => onSelectBatch?.(20)}
                className={`rounded-lg px-2 py-1 transition text-xs font-semibold ${
                  mcaBatch === 20
                    ? "bg-teal-500 text-slate-950"
                    : "text-slate-300 hover:text-white"
                }`}
                title="Original 20 Batch"
              >
                20 Batch
              </button>
            </div>

            {/* Tile Style Picker */}
            <div className="hidden sm:flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/95 p-1 text-xs backdrop-blur-md shadow-lg">
              <button
                onClick={() => setTileStyle("carto")}
                className={`rounded-lg px-2.5 py-1 transition ${
                  tileStyle === "carto"
                    ? "bg-slate-800 text-emerald-400 font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Detailed Tiles
              </button>
              <button
                onClick={() => setTileStyle("osm")}
                className={`rounded-lg px-2.5 py-1 transition ${
                  tileStyle === "osm"
                    ? "bg-slate-800 text-emerald-400 font-semibold"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                OSM Standard
              </button>
            </div>
          </div>

          {/* Map Body */}
          <div className="relative h-[560px] w-full">
            {error ? (
              <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 mb-3">
                  <MapPin className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-200">Unable to load map data</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">{error}</p>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Retry Map Connection</span>
                  </button>
                )}
              </div>
            ) : totalPinsCount === 0 && !loading && !mcaLoading ? (
              <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-800 text-slate-400 mb-3">
                  <MapPin className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold text-slate-200">No startup locations found in this corridor</h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Try selecting &quot;All Corridors&quot; to inspect all startup locations and verified job offices.
                </p>
                <button
                  onClick={() => onSelectLocality("")}
                  className="mt-4 inline-flex items-center rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Show All Corridors
                </button>
              </div>
            ) : (
              <InteractiveMap
                jobs={mapJobs}
                mcaCompanies={mcaCompanies}
                showMcaLayer={showMcaLayer}
                showJobsLayer={showJobsLayer}
                onSelectOffice={onSelectOffice}
                onOpenCompanyModal={onOpenCompanyModal}
                tileStyle={tileStyle}
              />
            )}
          </div>

          {/* Bottom Status Ribbon */}
          <div className="border-t border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-slate-300">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Plotted on Map:</strong> {totalPinsCount} Locations ({mcaCount} MCA Candidates + {uniqueOfficesCount} Database Job Offices)
                </span>
              </div>
              <span className="hidden sm:inline text-slate-600">•</span>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Building2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Batch {mcaBatch}: Unverified Candidates (Requires Manual Review)</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-slate-400 text-[11px]">
              <Layers className="h-3.5 w-3.5" />
              <span>Read-Only CSV Preview • PostgreSQL Database Untouched (8 Verified Startups)</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
