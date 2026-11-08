"use client";

import {
  MapPin,
  RefreshCw,
  Building2,
  Loader2,
  Compass,
} from "lucide-react";
import { OfficeLocationMapResponse } from "@/types/api";
import { InteractiveMap } from "@/components/interactive-map";

interface MapSectionProps {
  locations: OfficeLocationMapResponse[];
  loading: boolean;
  error?: string | null;
  selectedLocality: string;
  onSelectLocality: (locality: string) => void;
  onSelectOffice?: (location: OfficeLocationMapResponse | null) => void;
  onOpenCompanyModal?: (companyId: number) => void;
  onRetry?: () => void;
}

const BENGALURU_CORRIDORS = [
  { id: "", label: "All Corridors" },
  { id: "Koramangala", label: "Koramangala" },
  { id: "Indiranagar", label: "Indiranagar" },
  { id: "HSR Layout", label: "HSR Layout" },
  { id: "Bellandur", label: "Bellandur / ORR" },
  { id: "Whitefield", label: "Whitefield" },
  { id: "JP Nagar", label: "JP Nagar" },
  { id: "Marathahalli", label: "Marathahalli" },
  { id: "Peenya", label: "Peenya Industrial" },
  { id: "Malleshwaram", label: "Malleshwaram" },
  { id: "Yelahanka", label: "Yelahanka" },
];

export function MapSection({
  locations = [],
  loading = false,
  error,
  selectedLocality,
  onSelectLocality,
  onSelectOffice,
  onOpenCompanyModal,
  onRetry,
}: MapSectionProps) {
  const hiringCount = locations.filter((l) => l.has_active_vacancies).length;
  const nonHiringCount = locations.filter((l) => !l.has_active_vacancies).length;

  return (
    <section id="map-section" className="scroll-mt-16 py-14 bg-slate-950 text-white border-b border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-300">
                <Compass className="h-3.5 w-3.5 text-indigo-400" />
                <span>Geospatial Startup Atlas</span>
              </div>
              <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                <Building2 className="h-3.5 w-3.5" />
                <span>{locations.length} Plotted Premises</span>
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Tech Corridors &amp; Office Locations Map
            </h2>

            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl leading-relaxed">
              Explore verified startup headquarters and technology offices across Greater Bengaluru.
              Click any green beacon to inspect active engineering openings, or explore verified office premises.
            </p>
          </div>

          {/* Hiring vs Non-Hiring Status Legend */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2.5 rounded-xl bg-slate-900/90 px-3.5 py-2 text-xs text-slate-300 border border-slate-800 shadow-sm backdrop-blur-md">
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span>Hiring:</span>
                <span className="text-emerald-400 font-bold font-mono">{hiringCount}</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-slate-500" />
                <span>Zero Vacancies:</span>
                <span className="text-slate-400 font-bold font-mono">{nonHiringCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Corridor Filter Chips */}
        <div id="tech-hubs" className="mb-5 flex flex-wrap items-center gap-2">
          {BENGALURU_CORRIDORS.map((corridor) => {
            const isCurrent =
              selectedLocality.toLowerCase() === corridor.id.toLowerCase();
            return (
              <button
                key={corridor.id}
                type="button"
                onClick={() => onSelectLocality(corridor.id)}
                className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition cursor-pointer select-none ${
                  isCurrent
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-500"
                    : "bg-slate-900/80 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white hover:border-slate-700"
                }`}
              >
                {corridor.id && <MapPin className={`h-3 w-3 ${isCurrent ? "text-white" : "text-indigo-400"}`} />}
                <span>{corridor.label}</span>
              </button>
            );
          })}
        </div>

        {/* Map Viewport Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl h-[520px] sm:h-[600px]">
          {loading && locations.length === 0 ? (
            <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950 text-slate-400 p-8 text-center space-y-3">
              <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
              <p className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Loading Verified Bengaluru Coordinates...
              </p>
            </div>
          ) : error ? (
            <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950 text-slate-400 p-8 text-center">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mb-3">
                <MapPin className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">Failed to Load Map Locations</h3>
              <p className="text-xs text-slate-400 max-w-md mb-4">{error}</p>
              {onRetry && (
                <button
                  type="button"
                  onClick={onRetry}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-lg hover:bg-indigo-500 transition cursor-pointer"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Retry Connection</span>
                </button>
              )}
            </div>
          ) : (
            <InteractiveMap
              locations={locations}
              onSelectOffice={onSelectOffice}
              onOpenCompanyModal={onOpenCompanyModal}
            />
          )}
        </div>
      </div>
    </section>
  );
}
