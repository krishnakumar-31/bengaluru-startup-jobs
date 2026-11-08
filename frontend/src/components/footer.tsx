import Link from "next/link";
import { MapPin, Heart, Shield, Server, ExternalLink, Sparkles } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-slate-950 text-slate-400 text-xs font-sans">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 text-white shadow-md shadow-indigo-500/20">
                <MapPin className="h-4 w-4" />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-bold text-white tracking-tight">
                  Bengaluru Startup Jobs Map
                </span>
                <span className="rounded-md bg-indigo-500/20 border border-indigo-400/30 px-1.5 py-0.5 text-[9px] font-bold text-indigo-300 uppercase">
                  Atlas
                </span>
              </div>
            </div>

            <p className="text-slate-400 text-xs sm:text-sm max-w-md leading-relaxed">
              A community-first platform mapping genuine career opportunities across Greater
              Bengaluru&apos;s startup clusters—from Koramangala and HSR Layout to Indiranagar,
              Bellandur, and Whitefield tech parks.
            </p>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 pt-1">
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                PostgreSQL 18 Live Verified
              </span>
              <span>•</span>
              <span>Built for Namma Bengaluru Tech Ecosystem</span>
            </div>
          </div>

          {/* Key Tech Corridors */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              Bengaluru Corridors
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <a href="#map-section" className="hover:text-indigo-400 transition flex items-center justify-between">
                  <span>Koramangala VC Hub</span>
                  <span className="text-[10px] text-slate-600 font-mono">560034</span>
                </a>
              </li>
              <li>
                <a href="#map-section" className="hover:text-indigo-400 transition flex items-center justify-between">
                  <span>HSR Layout Scaleup Strip</span>
                  <span className="text-[10px] text-slate-600 font-mono">560102</span>
                </a>
              </li>
              <li>
                <a href="#map-section" className="hover:text-indigo-400 transition flex items-center justify-between">
                  <span>Indiranagar Product Studios</span>
                  <span className="text-[10px] text-slate-600 font-mono">560038</span>
                </a>
              </li>
              <li>
                <a href="#map-section" className="hover:text-indigo-400 transition flex items-center justify-between">
                  <span>Bellandur / Outer Ring Road</span>
                  <span className="text-[10px] text-slate-600 font-mono">560103</span>
                </a>
              </li>
              <li>
                <a href="#map-section" className="hover:text-indigo-400 transition flex items-center justify-between">
                  <span>Whitefield Tech Parks</span>
                  <span className="text-[10px] text-slate-600 font-mono">560066</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Quick Links & Control Plane */}
          <div className="space-y-3">
            <h4 className="font-bold text-white text-xs uppercase tracking-wider">
              Platform &amp; Admin
            </h4>
            <ul className="space-y-2 text-slate-400">
              <li>
                <a href="#job-listings" className="hover:text-indigo-400 transition flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Discover Openings</span>
                </a>
              </li>
              <li>
                <a href="#map-section" className="hover:text-indigo-400 transition flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Geospatial Office Map</span>
                </a>
              </li>
              <li>
                <Link href="/admin/login" className="hover:text-indigo-400 transition flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Admin Control Portal</span>
                </Link>
              </li>
              <li>
                <Link href="/admin/dashboard/imports" className="hover:text-indigo-400 transition flex items-center gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                  <span>35-Col CSV Importer</span>
                </Link>
              </li>
            </ul>

            <div className="pt-2">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-2.5 text-[11px] text-slate-400 flex items-center gap-2">
                <Server className="h-4 w-4 text-indigo-400 shrink-0" />
                <span>Next.js 16 + FastAPI + PostgreSQL</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom copyright & attribution */}
        <div className="mt-10 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
          <p>© 2026 Bengaluru Startup Jobs Map. All rights reserved.</p>
          <p className="flex items-center gap-1">
            Engineered with <Heart className="h-3 w-3 text-rose-500 fill-rose-500" /> for the Karnataka tech startup ecosystem.
          </p>
        </div>
      </div>
    </footer>
  );
}
