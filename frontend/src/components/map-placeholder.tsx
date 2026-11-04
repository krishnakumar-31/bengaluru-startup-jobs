"use client";

import { useState } from "react";
import {
  MapPin,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Navigation,
  Info,
  Sparkles,
} from "lucide-react";
import { SAMPLE_TECH_HUBS } from "@/lib/sample-data";

interface MapPlaceholderProps {
  selectedHub: string;
  onSelectHub: (hubId: string) => void;
}

export function MapPlaceholder({ selectedHub, onSelectHub }: MapPlaceholderProps) {
  const [activeLayer, setActiveLayer] = useState<"standard" | "clusters">("standard");

  return (
    <section id="map-section" className="scroll-mt-20 py-12 bg-slate-900 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Bengaluru Geographic Engine</span>
            </div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Startup Corridors & Tech Clusters Map
            </h2>
            <p className="mt-1 text-sm text-slate-400 max-w-2xl">
              Explore startup headquarters across Karnataka&apos;s capital. Click a hub to filter jobs in that cluster.
              Interactive Leaflet tile rendering is prepared for Phase 2.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Base Center:</span>
            <code className="rounded bg-slate-800 px-2 py-1 text-xs text-emerald-400 font-mono">
              12.9716° N, 77.5946° E (Bengaluru)
            </code>
          </div>
        </div>

        {/* Interactive Hub Pills for Quick Filtering */}
        <div id="tech-hubs" className="mb-6 flex flex-wrap items-center gap-2">
          <button
            onClick={() => onSelectHub("")}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
              selectedHub === ""
                ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30"
                : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            }`}
          >
            All Corridors
          </button>
          {SAMPLE_TECH_HUBS.map((hub) => (
            <button
              key={hub.id}
              onClick={() => onSelectHub(hub.id)}
              className={`flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
                selectedHub === hub.id
                  ? "bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/30"
                  : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <MapPin className="h-3 w-3 text-emerald-400" />
              <span>{hub.name}</span>
            </button>
          ))}
        </div>

        {/* Map Canvas Placeholder Card */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950 shadow-2xl">
          {/* Simulated Map Viewport */}
          <div className="relative h-[480px] w-full overflow-hidden bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] flex items-center justify-center">
            {/* Top Toolbar overlay */}
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
              <div className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200 backdrop-blur-md">
                <Navigation className="h-3.5 w-3.5 text-emerald-400" />
                <span className="font-semibold">Bengaluru Urban District</span>
              </div>
              <div className="hidden sm:flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/90 p-1 text-xs backdrop-blur-md">
                <button
                  onClick={() => setActiveLayer("standard")}
                  className={`rounded-lg px-2.5 py-1 transition ${
                    activeLayer === "standard"
                      ? "bg-slate-800 text-emerald-400 font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Hub Overlay
                </button>
                <button
                  onClick={() => setActiveLayer("clusters")}
                  className={`rounded-lg px-2.5 py-1 transition ${
                    activeLayer === "clusters"
                      ? "bg-slate-800 text-emerald-400 font-semibold"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Density View
                </button>
              </div>
            </div>

            {/* Map Controls overlay */}
            <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5">
              <button
                type="button"
                className="rounded-lg border border-slate-700 bg-slate-900/90 p-2 text-slate-300 hover:bg-slate-800 hover:text-white backdrop-blur-md"
                title="Zoom In (Leaflet Integration Phase)"
              >
                <ZoomIn className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-700 bg-slate-900/90 p-2 text-slate-300 hover:bg-slate-800 hover:text-white backdrop-blur-md"
                title="Zoom Out (Leaflet Integration Phase)"
              >
                <ZoomOut className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-lg border border-slate-700 bg-slate-900/90 p-2 text-slate-300 hover:bg-slate-800 hover:text-white backdrop-blur-md"
                title="Full View"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>

            {/* Simulated Geographic Grid with Bengaluru Hub Node Cards */}
            <div className="relative w-full max-w-4xl px-4 py-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {SAMPLE_TECH_HUBS.map((hub) => {
                const isCurrent = selectedHub === hub.id;
                return (
                  <div
                    key={hub.id}
                    onClick={() => onSelectHub(hub.id)}
                    className={`cursor-pointer group relative rounded-xl border p-4 transition-all duration-200 ${
                      isCurrent
                        ? "border-emerald-500 bg-slate-900/95 shadow-lg shadow-emerald-500/10 scale-102"
                        : "border-slate-800 bg-slate-900/70 hover:border-slate-600 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="flex h-3 w-3 rounded-full bg-emerald-400 animate-pulse" />
                        <h4 className="font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors">
                          {hub.name}
                        </h4>
                      </div>
                      <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[11px] font-mono text-emerald-300">
                        Demo Pin
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-slate-400 line-clamp-2">
                      {hub.tagline}
                    </p>

                    <div className="mt-3 flex items-center justify-between border-t border-slate-800 pt-2 text-[11px] text-slate-400">
                      <span>{hub.prominentFor}</span>
                      <span className="font-medium text-emerald-400">Filter Hub →</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Status Ribbon */}
            <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-slate-800 bg-slate-900/90 px-4 py-3 backdrop-blur-md">
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <Info className="h-4 w-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Leaflet &amp; React-Leaflet Ready:</strong> Component container configured.
                  Tile provider and marker clusters will be mounted in Phase 2.
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Layers className="h-3.5 w-3.5 text-slate-400" />
                <span>OSM / CartoDB Basemaps</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
