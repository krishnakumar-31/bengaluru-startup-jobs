"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin, Briefcase, Compass, Menu, X, Sparkles, Building2 } from "lucide-react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand identity */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-indigo-600 text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight text-slate-900 group-hover:text-emerald-700 transition-colors">
                Bengaluru Startup Jobs
              </span>
              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-800 uppercase tracking-wider">
                Map
              </span>
            </div>
            <span className="text-xs text-slate-500">Tech Ecosystem & Corridor Explorer</span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-600">
          <a
            href="#map-section"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Compass className="h-4 w-4 text-emerald-600" />
            <span>Interactive Map</span>
          </a>
          <a
            href="#job-listings"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Briefcase className="h-4 w-4 text-emerald-600" />
            <span>Explore Jobs</span>
          </a>
          <a
            href="#tech-hubs"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 transition hover:bg-slate-100 hover:text-slate-900"
          >
            <Building2 className="h-4 w-4 text-emerald-600" />
            <span>Bengaluru Hubs</span>
          </a>
        </nav>

        {/* Right Action buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-xs text-emerald-800 font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>API: Connected (v1)</span>
          </div>

          <a
            href="#job-listings"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-600/30 transition hover:bg-emerald-700 active:scale-95"
          >
            <Sparkles className="h-4 w-4" />
            <span>Discover Roles</span>
          </a>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex sm:hidden">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-lg p-2 text-slate-700 hover:bg-slate-100"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white px-4 py-4 space-y-2">
          <a
            href="#map-section"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <Compass className="h-4 w-4 text-emerald-600" />
            Interactive Map
          </a>
          <a
            href="#job-listings"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <Briefcase className="h-4 w-4 text-emerald-600" />
            Explore Jobs
          </a>
          <a
            href="#tech-hubs"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <Building2 className="h-4 w-4 text-emerald-600" />
            Bengaluru Hubs
          </a>
          <div className="pt-2">
            <a
              href="#job-listings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow"
            >
              <Sparkles className="h-4 w-4" />
              Discover Roles
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
