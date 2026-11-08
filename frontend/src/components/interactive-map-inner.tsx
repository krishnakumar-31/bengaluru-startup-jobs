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
  CheckCircle2,
  Building2,
  MapPin,
  ExternalLink,
} from "lucide-react";
import { OfficeLocationMapResponse } from "@/types/api";
import { getCompanyInitials } from "@/lib/formatters";

// Center on Bengaluru city center (Cubbon Park / Vidhana Soudha area)
const BENGALURU_CENTER: [number, number] = [12.9716, 77.5946];
const DEFAULT_ZOOM = 12;

/**
 * Creates custom SVG HTML marker icon for approved company offices.
 * Distinct green marker for hiring offices, and distinct muted slate-emerald marker for non-hiring offices.
 */
function createOfficeMarkerIcon(
  hasActiveVacancies: boolean,
  activeJobsCount: number,
  initials: string,
  isSelected: boolean
) {
  let bgClass: string;
  let badgeHtml = "";
  let pinClass: string;
  let dotColor: string;

  if (hasActiveVacancies) {
    // Green markers for approved offices with active vacancies
    bgClass = isSelected
      ? "bg-gradient-to-br from-emerald-500 to-teal-700 ring-4 ring-emerald-400/80 shadow-emerald-500/60 scale-110"
      : "bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700 hover:scale-110 ring-2 ring-white shadow-emerald-700/40";
    badgeHtml = `<span class="absolute -top-1.5 -right-1.5 flex h-4 min-w-[18px] px-1 items-center justify-center rounded-full bg-amber-400 text-[9px] font-black text-slate-900 border border-white shadow-sm" title="${activeJobsCount} active role(s)">${activeJobsCount}</span>`;
    pinClass = "custom-approved-hiring-pin";
    dotColor = "bg-emerald-700";
  } else {
    // Distinct muted marker for approved offices with no current vacancies
    bgClass = isSelected
      ? "bg-gradient-to-br from-slate-700 to-slate-900 ring-4 ring-slate-400/80 shadow-slate-900/60 scale-110 border border-slate-500"
      : "bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 hover:scale-110 ring-2 ring-slate-300 shadow-slate-900/30 border border-slate-500";
    badgeHtml = `<span class="absolute -top-1.5 -right-1.5 flex h-3.5 min-w-[14px] px-0.5 items-center justify-center rounded-full bg-slate-200 text-[8px] font-bold text-slate-700 border border-white shadow-sm" title="No active vacancies">0</span>`;
    pinClass = "custom-approved-nonhiring-pin";
    dotColor = "bg-slate-700";
  }

  const html = `
    <div class="relative group cursor-pointer">
      <div class="flex h-9 w-9 items-center justify-center rounded-2xl ${bgClass} text-white font-bold text-xs shadow-lg transition-transform duration-200">
        <span>${initials}</span>
      </div>
      ${badgeHtml}
      <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 ${dotColor} rounded-full"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: pinClass,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -36],
  });
}

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
        duration: 0.8,
      });
      return;
    }

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(
        allPoints.map((p) => [p.latitude, p.longitude] as [number, number])
      );
      if (bounds.isValid()) {
        map.fitBounds(bounds, {
          padding: [50, 50],
          maxZoom: 14,
        });
      }
    }
  }, [selectedPoint, allPoints, map]);

  return null;
}

export interface InteractiveMapInnerProps {
  locations: OfficeLocationMapResponse[];
  selectedOfficeId?: number | null;
  onSelectOffice?: (location: OfficeLocationMapResponse | null) => void;
  onOpenCompanyModal?: (companyId: number) => void;
}

export default function InteractiveMapInner({
  locations = [],
  selectedOfficeId,
  onSelectOffice,
  onOpenCompanyModal,
}: InteractiveMapInnerProps) {
  const [clickedLocation, setClickedLocation] = useState<OfficeLocationMapResponse | null>(null);

  // Filter valid coordinates within bounds
  const validLocations = useMemo(() => {
    return locations.filter((loc) => {
      return (
        typeof loc.latitude === "number" &&
        typeof loc.longitude === "number" &&
        !isNaN(loc.latitude) &&
        !isNaN(loc.longitude) &&
        loc.latitude >= 12.0 &&
        loc.latitude <= 14.0 &&
        loc.longitude >= 77.0 &&
        loc.longitude <= 78.5
      );
    });
  }, [locations]);

  const allPoints = useMemo(() => {
    return validLocations.map((l) => ({
      latitude: l.latitude,
      longitude: l.longitude,
    }));
  }, [validLocations]);

  const selectedPoint = useMemo(() => {
    if (clickedLocation) {
      return { latitude: clickedLocation.latitude, longitude: clickedLocation.longitude };
    }
    if (selectedOfficeId) {
      const found = validLocations.find((l) => l.office_id === selectedOfficeId);
      if (found) return { latitude: found.latitude, longitude: found.longitude };
    }
    return null;
  }, [clickedLocation, selectedOfficeId, validLocations]);

  // Statistics for map legend
  const hiringCount = useMemo(
    () => validLocations.filter((l) => l.has_active_vacancies).length,
    [validLocations]
  );
  const nonHiringCount = useMemo(
    () => validLocations.filter((l) => !l.has_active_vacancies).length,
    [validLocations]
  );
  const totalVacanciesOnMap = useMemo(
    () => validLocations.reduce((sum, l) => sum + (l.total_vacancies || 0), 0),
    [validLocations]
  );

  // Reliable OpenStreetMap standard tile provider with zero API key requirement
  const tileUrl = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const tileAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

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

        {validLocations.map((loc) => {
          const isSelected =
            clickedLocation?.office_id === loc.office_id ||
            selectedOfficeId === loc.office_id;
          const initials = getCompanyInitials(loc.company_name);
          const icon = createOfficeMarkerIcon(
            loc.has_active_vacancies,
            loc.active_jobs_count,
            initials,
            isSelected
          );

          return (
            <Marker
              key={`office-${loc.office_id}`}
              position={[loc.latitude, loc.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => {
                  setClickedLocation(loc);
                  if (onSelectOffice) {
                    onSelectOffice(loc);
                  }
                },
              }}
            >
              <Popup className="custom-popup" maxWidth={340} minWidth={280}>
                <div className="p-3.5 text-slate-900 space-y-2.5">
                  {/* Header: Company Name & Approval Badge */}
                  <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-sm">
                        {initials}
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 leading-tight">
                          {loc.company_name}
                        </h4>
                        <div className="flex items-center gap-1 mt-0.5">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-[11px] font-semibold text-emerald-700">
                            Approved Entity
                          </span>
                        </div>
                      </div>
                    </div>
                    {loc.industry && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                        {loc.industry}
                      </span>
                    )}
                  </div>

                  {/* Office & Locality */}
                  <div className="space-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5 font-medium text-slate-800">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{loc.locality || "Bengaluru"}, Karnataka</span>
                      {loc.is_headquarters && (
                        <span className="rounded bg-indigo-50 px-1.5 py-0.2 text-[9px] font-semibold text-indigo-700">
                          HQ
                        </span>
                      )}
                    </div>
                    {loc.address && (
                      <p className="text-[11px] text-slate-500 pl-5 line-clamp-2">
                        {loc.address}
                      </p>
                    )}
                  </div>

                  {/* Vacancy & Hiring Status Card */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-2.5">
                    {loc.has_active_vacancies ? (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Actively Hiring</span>
                          </span>
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                            {loc.active_jobs_count} {loc.active_jobs_count === 1 ? "Role" : "Roles"} ({loc.total_vacancies} {loc.total_vacancies === 1 ? "Vacancy" : "Vacancies"})
                          </span>
                        </div>
                        <div className="space-y-1 pt-1">
                          {loc.jobs.slice(0, 3).map((job) => (
                            <div
                              key={`job-${job.id}`}
                              className="flex items-center justify-between text-[11px] bg-white rounded-lg p-1.5 border border-slate-200/60"
                            >
                              <span className="font-medium text-slate-800 truncate max-w-[180px]">
                                {job.title}
                              </span>
                              <span className="text-[10px] text-slate-500 capitalize shrink-0 font-mono">
                                {job.work_mode || job.employment_type}
                              </span>
                            </div>
                          ))}
                          {loc.jobs.length > 3 && (
                            <p className="text-[10px] text-slate-500 text-center italic">
                              +{loc.jobs.length - 3} more open engineering role(s)
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-500 text-xs py-1">
                        <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                        <div>
                          <p className="font-medium text-slate-700">No Active Vacancies</p>
                          <p className="text-[10px] text-slate-400">
                            Operating office with no current engineering openings.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* CTA: View Company Details */}
                  {onOpenCompanyModal && (
                    <button
                      type="button"
                      onClick={() => onOpenCompanyModal(loc.company_id)}
                      className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 active:scale-95"
                    >
                      <span>View Company Profile</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Floating Modern SaaS Map Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] hidden sm:block max-w-xs rounded-2xl border border-slate-800 bg-slate-950/90 p-3.5 text-white shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between gap-2 border-b border-slate-800/80 pb-2 mb-2.5">
          <div className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-bold text-white tracking-tight">Bengaluru Tech Map</span>
          </div>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 font-mono">
            {validLocations.length} Approved
          </span>
        </div>

        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              <span className="text-slate-300 font-medium">Offices with Active Openings</span>
            </div>
            <span className="font-bold text-emerald-400 font-mono">{hiringCount}</span>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-3 w-3 rounded-full bg-slate-600 border border-slate-400" />
              <span className="text-slate-400 font-medium">Offices with No Vacancies</span>
            </div>
            <span className="font-bold text-slate-400 font-mono">{nonHiringCount}</span>
          </div>

          <div className="border-t border-slate-800/80 pt-1.5 flex items-center justify-between text-[11px] text-slate-400">
            <span>Total Vacancies on Map:</span>
            <span className="font-bold text-white font-mono">{totalVacanciesOnMap}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
