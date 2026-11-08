"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MapPin,
  Briefcase,
  Compass,
  Menu,
  X,
  Sparkles,
  Building2,
  Shield,
  ArrowRight,
} from "lucide-react";

export function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");

  // Track active section on scroll for clean navigation state
  useEffect(() => {
    const handleScroll = () => {
      const sections = ["map-section", "featured-companies", "job-listings", "tech-hubs"];
      const scrollPos = window.scrollY + 120;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(`#${sectionId}`);
            return;
          }
        }
      }
      if (window.scrollY < 200) {
        setActiveSection("");
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "#map-section", label: "Interactive Map", icon: Compass },
    { href: "#featured-companies", label: "Top Startups", icon: Building2 },
    { href: "#job-listings", label: "Explore Jobs", icon: Briefcase },
    { href: "#tech-hubs", label: "Bengaluru Hubs", icon: Sparkles },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
      <div className="mx-auto flex h-[70px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand identity - Clean Reference Style */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm group-hover:scale-105 transition-all duration-200">
            <MapPin className="h-5 w-5 text-orange-500" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-lg font-extrabold tracking-tight text-slate-900 group-hover:text-orange-600 transition-colors">
                Bengaluru Startup Jobs
              </span>
              <span className="rounded-md bg-orange-500 px-1.5 py-0.5 text-[10px] font-extrabold text-white uppercase tracking-wider shadow-xs">
                Map
              </span>
            </div>
            <span className="text-[11px] text-slate-500 font-medium tracking-normal">
              Verified Tech Ecosystem &amp; Corridor Directory
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-xs lg:text-sm font-semibold text-slate-700">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-1.5 rounded-xl px-3.5 py-2 transition-all duration-200 ${
                  isActive
                    ? "text-orange-600 font-bold bg-orange-50/80"
                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-100/70"
                }`}
              >
                <Icon
                  className={`h-4 w-4 transition-colors ${
                    isActive ? "text-orange-500" : "text-slate-400 group-hover:text-slate-600"
                  }`}
                />
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-orange-500" />
                )}
              </a>
            );
          })}
        </nav>

        {/* Right Action buttons: Login + Orange CTA (Inspired by reference) */}
        <div className="hidden sm:flex items-center gap-2.5">
          <Link
            href="/admin/login"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-50 transition-all shadow-xs"
            title="Administrator Portal"
          >
            <Shield className="h-3.5 w-3.5 text-slate-500" />
            <span>Login</span>
          </Link>

          <a
            href="#job-listings"
            className="inline-flex items-center gap-1.5 rounded-xl bg-orange-500 px-4 sm:px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-sm shadow-orange-500/25 hover:bg-orange-600 active:scale-95 transition-all duration-150 cursor-pointer"
          >
            <span>Discover Roles</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex sm:hidden items-center gap-2">
          <Link
            href="/admin/login"
            className="p-2 rounded-xl text-slate-600 hover:text-slate-950 hover:bg-slate-100 transition"
            title="Admin Login"
          >
            <Shield className="h-4 w-4" />
          </Link>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="inline-flex items-center justify-center rounded-xl p-2 text-slate-700 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-slate-200 bg-white text-slate-900 px-4 py-4 space-y-2.5 shadow-xl animate-in slide-in-from-top-2 duration-150">
          <div className="pb-2 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>Navigation Menu</span>
            <span className="inline-flex items-center gap-1 text-emerald-600 font-mono text-[11px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Directory Online
            </span>
          </div>

          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition ${
                  isActive
                    ? "bg-orange-50 text-orange-600 border-l-2 border-orange-500"
                    : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-orange-500" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </a>
            );
          })}

          <div className="pt-2 flex flex-col gap-2">
            <a
              href="#job-listings"
              onClick={() => setMobileMenuOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm shadow-orange-500/25 hover:bg-orange-600 transition"
            >
              <span>Discover Roles</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </a>

            <Link
              href="/admin/login"
              onClick={() => setMobileMenuOpen(false)}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              <Shield className="h-4 w-4 text-slate-500" />
              <span>Admin Management Portal</span>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
