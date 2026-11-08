"use client";

import dynamic from "next/dynamic";
import { Loader2, MapPin } from "lucide-react";
import { OfficeLocationMapResponse } from "@/types/api";

export interface InteractiveMapProps {
  locations: OfficeLocationMapResponse[];
  selectedOfficeId?: number | null;
  onSelectOffice?: (location: OfficeLocationMapResponse | null) => void;
  onOpenCompanyModal?: (companyId: number) => void;
}

const DynamicInteractiveMap = dynamic(
  () => import("./interactive-map-inner"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full flex-col items-center justify-center bg-slate-950 text-slate-400 p-8 rounded-2xl min-h-[460px]">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3 animate-pulse">
          <MapPin className="h-6 w-6" />
        </div>
        <div className="flex items-center gap-2 text-sm font-medium text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
          <span>Mounting Bengaluru Interactive Map...</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">Loading OpenStreetMap tiles and approved company coordinates</p>
      </div>
    ),
  }
);

export function InteractiveMap(props: InteractiveMapProps) {
  return <DynamicInteractiveMap {...props} />;
}
