"use client";

import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import {
  MapPin,
  CheckCircle2,
  Building2,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ApiJobMap, GroupedOfficeLocation, MCAPreviewCompany } from "@/types";
import { formatSalaryRange, getCompanyInitials } from "@/lib/formatters";

// Center on Bengaluru city center (Cubbon Park / Vidhana Soudha area)
const BENGALURU_CENTER: [number, number] = [12.9716, 77.5946];
const DEFAULT_ZOOM = 12;

/**
 * Creates custom SVG HTML marker icon for verified Startup Job offices.
 */
function createJobOfficeMarkerIcon(isSelected: boolean, jobCount: number, initials: string) {
  const bgClass = isSelected
    ? "bg-gradient-to-br from-violet-600 to-indigo-800 ring-4 ring-violet-400/60 shadow-violet-600/50 scale-110"
    : "bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 hover:scale-110 ring-2 ring-white shadow-indigo-700/40";

  const badgeHtml =
    jobCount > 0
      ? `<span class="absolute -top-1.5 -right-1.5 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-slate-900 border border-white shadow-sm">${jobCount}</span>`
      : "";

  const html = `
    <div class="relative group cursor-pointer">
      <div class="flex h-9 w-9 items-center justify-center rounded-2xl ${bgClass} text-white font-bold text-xs shadow-lg transition-transform duration-200">
        <span>${initials}</span>
      </div>
      ${badgeHtml}
      <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-700 rounded-full"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "custom-job-pin",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

/**
 * Creates custom SVG HTML marker icon for MCA Preview records.
 * Distinguishes address-level OSM geocoding (Emerald/Teal) from locality centroid (Amber/Orange).
 */
function createMcaMarkerIcon(company: MCAPreviewCompany, isSelected: boolean) {
  const isAddressLevel = company.geocoding_source === "nominatim_osm";
  const initials = getCompanyInitials(company.name);

  // Address-level (OSM): Emerald / Teal gradient
  // Locality centroid: Amber / Orange gradient
  const bgClass = isAddressLevel
    ? isSelected
      ? "bg-gradient-to-br from-emerald-500 to-teal-700 ring-4 ring-emerald-300 shadow-emerald-500/60 scale-110"
      : "bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 ring-2 ring-white shadow-emerald-700/40 hover:scale-110"
    : isSelected
      ? "bg-gradient-to-br from-amber-500 to-orange-600 ring-4 ring-amber-300 shadow-orange-500/60 scale-110"
      : "bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 ring-2 ring-white shadow-amber-700/40 hover:scale-110";

  const badgeText = isAddressLevel ? "OSM" : "AREA";
  const badgeClass = isAddressLevel
    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
    : "bg-amber-100 text-amber-900 border-amber-300";

  const dotColor = isAddressLevel ? "bg-teal-700" : "bg-orange-700";

  const html = `
    <div class="relative group cursor-pointer">
      <div class="flex h-9 w-9 items-center justify-center rounded-2xl ${bgClass} text-white font-bold text-xs shadow-lg transition-transform duration-200">
        <span>${initials}</span>
      </div>
      <span class="absolute -top-1.5 -right-1.5 flex px-1 py-0.2 items-center justify-center rounded-full ${badgeClass} text-[8px] font-black tracking-tight border shadow-sm">
        ${badgeText}
      </span>
      <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 ${dotColor} rounded-full"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: isAddressLevel ? "custom-mca-osm-pin" : "custom-mca-centroid-pin",
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

/**
 * Controller to fly to selected marker or fit bounds around all plotted points.
 */
function MapController({
  selectedPoint,
  allPoints,
}: {
  selectedPoint: { latitude: number; longitude: number } | null;
  allPoints: { latitude: number; longitude: number }[];
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedPoint) {
      map.flyTo([selectedPoint.latitude, selectedPoint.longitude], 14, {
        duration: 1.2,
      });
    } else if (allPoints.length > 0) {
      const validPoints = allPoints.filter(
        (p) =>
          typeof p.latitude === "number" &&
          typeof p.longitude === "number" &&
          !isNaN(p.latitude) &&
          !isNaN(p.longitude)
      );
      if (validPoints.length > 0) {
        const bounds = L.latLngBounds(
          validPoints.map((p) => [p.latitude, p.longitude] as [number, number])
        );
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        }
      }
    }
  }, [selectedPoint, allPoints, map]);

  return null;
}

export interface InteractiveMapInnerProps {
  jobs: ApiJobMap[];
  mcaCompanies?: MCAPreviewCompany[];
  showMcaLayer?: boolean;
  showJobsLayer?: boolean;
  selectedOfficeId?: number | null;
  onSelectOffice?: (office: GroupedOfficeLocation | null) => void;
  onOpenCompanyModal?: (companyId: number) => void;
  tileStyle?: "osm" | "carto";
}

export default function InteractiveMapInner({
  jobs = [],
  mcaCompanies = [],
  showMcaLayer = true,
  showJobsLayer = true,
  selectedOfficeId,
  onSelectOffice,
  onOpenCompanyModal,
  tileStyle = "carto",
}: InteractiveMapInnerProps) {
  const [clickedOffice, setClickedOffice] = useState<GroupedOfficeLocation | null>(null);
  const [clickedMca, setClickedMca] = useState<MCAPreviewCompany | null>(null);
  const [isLegendExpanded, setIsLegendExpanded] = useState<boolean>(true);

  // Group multiple jobs sharing the same office location
  const groupedOffices = useMemo(() => {
    if (!showJobsLayer) return [];

    const map = new Map<string, GroupedOfficeLocation>();

    jobs.forEach((job) => {
      // Validate latitude and longitude bounds (Greater Bengaluru)
      if (
        typeof job.latitude !== "number" ||
        typeof job.longitude !== "number" ||
        isNaN(job.latitude) ||
        isNaN(job.longitude) ||
        job.latitude < 12.0 ||
        job.latitude > 14.0 ||
        job.longitude < 77.0 ||
        job.longitude > 78.5
      ) {
        return;
      }

      const key = `${job.office_id}-${job.latitude.toFixed(5)}-${job.longitude.toFixed(5)}`;

      if (!map.has(key)) {
        map.set(key, {
          officeId: job.office_id,
          companyId: job.company_id,
          companyName: job.company_name,
          companySlug: job.slug,
          companyLogo: job.company?.logo_url,
          locality: job.locality,
          address: job.address || job.office?.address,
          city: job.city || "Bengaluru",
          latitude: job.latitude,
          longitude: job.longitude,
          jobs: [],
        });
      }

      const office = map.get(key)!;
      office.jobs.push({
        id: job.id,
        title: job.title,
        slug: job.slug,
        employment_type: job.employment_type,
        experience_level: job.experience_level,
        salary_min: job.salary_min,
        salary_max: job.salary_max,
        currency: job.currency,
        skills: job.skills,
      });
    });

    return Array.from(map.values());
  }, [jobs, showJobsLayer]);

  // Valid MCA records with safe coordinates
  const validMcaCompanies = useMemo(() => {
    if (!showMcaLayer) return [];

    return mcaCompanies.filter((company) => {
      return (
        typeof company.latitude === "number" &&
        typeof company.longitude === "number" &&
        !isNaN(company.latitude) &&
        !isNaN(company.longitude) &&
        company.latitude >= 12.0 &&
        company.latitude <= 14.0 &&
        company.longitude >= 77.0 &&
        company.longitude <= 78.5
      );
    });
  }, [mcaCompanies, showMcaLayer]);

  // Compute breakdown counts for legend
  const addressLevelCount = useMemo(() => {
    return validMcaCompanies.filter((c) => c.geocoding_source === "nominatim_osm").length;
  }, [validMcaCompanies]);

  const localityCentroidCount = useMemo(() => {
    return validMcaCompanies.filter((c) => c.geocoding_source !== "nominatim_osm").length;
  }, [validMcaCompanies]);

  // Combined point locations for auto-zoom / fitBounds
  const allPoints = useMemo(() => {
    const points: { latitude: number; longitude: number }[] = [];
    groupedOffices.forEach((o) => points.push({ latitude: o.latitude, longitude: o.longitude }));
    validMcaCompanies.forEach((c) => points.push({ latitude: c.latitude, longitude: c.longitude }));
    return points;
  }, [groupedOffices, validMcaCompanies]);

  // Currently selected point
  const selectedPoint = useMemo(() => {
    if (clickedOffice) return { latitude: clickedOffice.latitude, longitude: clickedOffice.longitude };
    if (clickedMca) return { latitude: clickedMca.latitude, longitude: clickedMca.longitude };
    if (selectedOfficeId) {
      const found = groupedOffices.find((o) => o.officeId === selectedOfficeId);
      if (found) return { latitude: found.latitude, longitude: found.longitude };
    }
    return null;
  }, [clickedOffice, clickedMca, selectedOfficeId, groupedOffices]);

  const tileUrl =
    tileStyle === "carto"
      ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const tileAttribution =
    tileStyle === "carto"
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={BENGALURU_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom={true}
        className="h-full w-full rounded-2xl"
      >
        <TileLayer attribution={tileAttribution} url={tileUrl} maxZoom={19} />

        <MapController selectedPoint={selectedPoint} allPoints={allPoints} />

        {/* --- LAYER 1: Verified Startup Job Offices --- */}
        {groupedOffices.map((office) => {
          const isSelected = clickedOffice?.officeId === office.officeId || selectedOfficeId === office.officeId;
          const initials = getCompanyInitials(office.companyName);
          const icon = createJobOfficeMarkerIcon(isSelected, office.jobs.length, initials);

          return (
            <Marker
              key={`office-${office.officeId}-${office.latitude}-${office.longitude}`}
              position={[office.latitude, office.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  setClickedMca(null);
                  setClickedOffice(office);
                  onSelectOffice?.(office);
                },
              }}
            >
              <Popup className="custom-leaflet-popup">
                <div className="w-72 sm:w-80 p-4 text-slate-800">
                  {/* Popup Header */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="font-bold text-base text-slate-900">
                          {office.companyName}
                        </h4>
                        <CheckCircle2 className="h-4 w-4 text-indigo-600 shrink-0" />
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                        <MapPin className="h-3 w-3 text-indigo-600 shrink-0" />
                        <span>{office.locality || "Bengaluru"}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onOpenCompanyModal?.(office.companyId)}
                      className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition shrink-0"
                    >
                      Company Profile
                    </button>
                  </div>

                  {/* Office Address */}
                  {office.address && (
                    <div className="mt-2.5 text-xs text-slate-600 leading-snug">
                      <span className="font-medium text-slate-700">Office:</span>{" "}
                      {office.address}
                    </div>
                  )}

                  {/* Coordinates pill */}
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-[10px] font-mono text-slate-600">
                    <span>{office.latitude.toFixed(4)}° N, {office.longitude.toFixed(4)}° E</span>
                  </div>

                  {/* Associated Jobs */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span>Open Roles at this Office ({office.jobs.length})</span>
                    </div>

                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {office.jobs.map((job) => (
                        <div
                          key={job.id}
                          className="rounded-lg border border-slate-200/90 bg-slate-50/70 p-2.5 text-xs space-y-1 hover:border-indigo-400 transition"
                        >
                          <div className="font-semibold text-slate-900">{job.title}</div>
                          <div className="text-[11px] text-slate-500">
                            {formatSalaryRange(job.salary_min, job.salary_max, job.currency || "INR")}
                          </div>
                          {job.skills && job.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {job.skills.slice(0, 3).map((s) => (
                                <span
                                  key={s}
                                  className="rounded bg-white px-1.5 py-0.2 text-[9px] font-medium text-slate-600 border border-slate-200"
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* --- LAYER 2: MCA Preview Startups --- */}
        {validMcaCompanies.map((company) => {
          const isSelected = clickedMca?.cin === company.cin;
          const isAddressLevel = company.geocoding_source === "nominatim_osm";
          const icon = createMcaMarkerIcon(company, isSelected);

          return (
            <Marker
              key={`mca-${company.cin}`}
              position={[company.latitude, company.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  setClickedOffice(null);
                  setClickedMca(company);
                },
              }}
            >
              <Popup className="custom-leaflet-popup">
                <div className="w-72 sm:w-80 p-4 text-slate-800">
                  {/* Popup Header */}
                  <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <Building2 className={`h-4 w-4 shrink-0 ${isAddressLevel ? 'text-emerald-600' : 'text-amber-600'}`} />
                        <h4 className="font-bold text-base text-slate-900 leading-tight">
                          {company.name}
                        </h4>
                      </div>
                      {company.legal_name && company.legal_name !== company.name && (
                        <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">
                          {company.legal_name}
                        </p>
                      )}
                      <div className="flex items-center gap-1 text-xs text-slate-600 mt-1">
                        <MapPin className={`h-3 w-3 shrink-0 ${isAddressLevel ? 'text-emerald-600' : 'text-amber-600'}`} />
                        <span className="font-semibold">{company.locality || "Bengaluru"}</span>
                        {company.postal_code && (
                          <span className="text-slate-400 font-mono text-[11px]">({company.postal_code})</span>
                        )}
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider shrink-0 border ${
                        isAddressLevel
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-amber-50 text-amber-900 border-amber-300"
                      }`}
                    >
                      {isAddressLevel ? "Address OSM" : "Area Centroid"}
                    </span>
                  </div>

                  {/* Metadata Tags */}
                  <div className="mt-2.5 flex flex-wrap gap-1.5 text-[11px]">
                    {company.industry && (
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-700 border border-slate-200">
                        {company.industry}
                      </span>
                    )}
                    {company.founded_year && (
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-600">
                        Est. {company.founded_year}
                      </span>
                    )}
                    <span
                      className={`rounded px-2 py-0.5 font-medium border text-[10px] ${
                        isAddressLevel
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      Confidence: {company.confidence.toUpperCase()}
                    </span>
                  </div>

                  {/* Registered Office Address */}
                  <div className="mt-2.5 text-xs text-slate-700 leading-snug">
                    <span className="font-semibold text-slate-900">Registered Office:</span>
                    <p className="mt-0.5 text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-200 text-[11px] leading-relaxed max-h-24 overflow-y-auto">
                      {company.address}
                    </p>
                  </div>

                  {/* Corporate Identifiers */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px] text-slate-600">
                    <div>
                      <span className="text-slate-400 block font-sans">CIN:</span>
                      <span className="font-mono font-medium text-slate-800 truncate block" title={company.cin}>
                        {company.cin}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-sans">Coordinates:</span>
                      <span className="font-mono text-slate-800 block">
                        {company.latitude.toFixed(4)}°, {company.longitude.toFixed(4)}°
                      </span>
                    </div>
                    {company.paidup_capital != null && company.paidup_capital > 0 && (
                      <div className="col-span-2">
                        <span className="text-slate-400 font-sans">Paid-up Capital: </span>
                        <span className="font-mono font-semibold text-slate-800">
                          {new Intl.NumberFormat("en-IN", {
                            style: "currency",
                            currency: "INR",
                            maximumFractionDigits: 0,
                          }).format(company.paidup_capital)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Candidate Discovery & Manual Review Status (Requirements 6 & 12) */}
                  <div className="mt-2.5 rounded bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-[10px] text-amber-900 flex items-center justify-between">
                    <span className="font-semibold">
                      {company.is_verified ? "Verified Startup" : "Candidate Startup (Unverified)"}
                    </span>
                    <span className="font-mono text-[9px] text-amber-800 bg-amber-100/80 px-1 py-0.2 rounded font-medium">
                      {company.candidate_status || "needs_manual_verification"}
                    </span>
                  </div>

                  {/* In-memory preview tag */}
                  <div className="mt-1.5 rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[9px] text-slate-600 flex items-center justify-between">
                    <span>MCA Master Data Test Batch</span>
                    <span className="font-mono text-[8px] text-slate-500">Read-Only Preview</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* --- FLOATING MAP LEGEND (Requirement 8) --- */}
      <div className="absolute bottom-4 left-4 z-20 pointer-events-auto max-w-xs">
        <div className="rounded-xl border border-slate-700/80 bg-slate-900/95 p-3 text-xs text-slate-200 backdrop-blur-md shadow-2xl transition-all">
          <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-800">
            <div className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 text-emerald-400" />
              <span className="font-bold text-[11px] text-white tracking-wide">
                Map Legend &amp; Marker Types
              </span>
            </div>
            <button
              onClick={() => setIsLegendExpanded(!isLegendExpanded)}
              className="text-slate-400 hover:text-white transition p-0.5 rounded"
              title={isLegendExpanded ? "Collapse Legend" : "Expand Legend"}
            >
              {isLegendExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
            </button>
          </div>

          {isLegendExpanded && (
            <div className="mt-2 space-y-2 text-[11px]">
              {/* Type 1: Address-Level Geocoding (OSM) */}
              <div className="flex items-start gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-[8px] font-black text-white shadow-sm ring-1 ring-emerald-300">
                  OSM
                </div>
                <div className="leading-tight">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-300">
                    <span>Address-Level Geocoded</span>
                    <span className="rounded bg-emerald-500/20 px-1 py-0.2 font-mono text-[10px] text-emerald-400">
                      {addressLevelCount}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Nominatim OpenStreetMap exact premise / street match
                  </p>
                </div>
              </div>

              {/* Type 2: Locality / Centroid Geocoding */}
              <div className="flex items-start gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-[8px] font-black text-white shadow-sm ring-1 ring-amber-300">
                  AREA
                </div>
                <div className="leading-tight">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-300">
                    <span>Locality / Area Centroid</span>
                    <span className="rounded bg-amber-500/20 px-1 py-0.2 font-mono text-[10px] text-amber-400">
                      {localityCentroidCount}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Neighborhood corridor centroid approximation
                  </p>
                </div>
              </div>

              {/* Type 3: Startup Job Offices */}
              <div className="flex items-start gap-2">
                <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-[8px] font-black text-white shadow-sm ring-1 ring-violet-300">
                  JOB
                </div>
                <div className="leading-tight">
                  <div className="flex items-center gap-1.5 font-semibold text-violet-300">
                    <span>Active Startup Jobs</span>
                    <span className="rounded bg-violet-500/20 px-1 py-0.2 font-mono text-[10px] text-violet-400">
                      {groupedOffices.length}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Verified startup headquarters with active roles
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
