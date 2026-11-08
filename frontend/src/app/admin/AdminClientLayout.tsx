"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  MapPin,
  UploadCloud,
  CheckCircle2,
  Settings,
  LogOut,
  Menu,
  X,
  Shield,
  ExternalLink,
  ChevronRight,
  User,
  Loader2,
} from "lucide-react";
import { AdminAuthProvider, useAdminAuth } from "@/lib/admin-auth";

function AdminLayoutContent({ children }: { children: React.ReactNode }) {
  const { admin, logout, isLoading } = useAdminAuth();
  const pathname = usePathname();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // For /admin/login, render without sidebar
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // Session verification flag:
  // Route children remain mounted in the DOM to satisfy Next.js instant navigation validation,
  // while an opaque authorization holding overlay prevents any flash of protected content or UI interaction.
  const isVerifying = isLoading || !admin;

  const navLinks = [
    { label: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Companies", href: "/admin/dashboard/companies", icon: Building2 },
    { label: "Jobs", href: "/admin/dashboard/jobs", icon: Briefcase },
    { label: "Offices", href: "/admin/dashboard/offices", icon: MapPin },
    { label: "Data Import", href: "/admin/dashboard/imports", icon: UploadCloud },
    { label: "Verification", href: "/admin/dashboard/verification", icon: CheckCircle2 },
    { label: "Settings", href: "/admin/dashboard/settings", icon: Settings },
  ];

  // Helper for breadcrumbs
  const getBreadcrumbTitle = () => {
    if (pathname === "/admin/dashboard") return "Overview";
    if (pathname.includes("/companies/new")) return "Companies / New";
    if (pathname.includes("/companies/") && pathname.includes("/edit")) return "Companies / Edit";
    if (pathname.includes("/companies")) return "Companies";
    if (pathname.includes("/jobs/new")) return "Jobs / New";
    if (pathname.includes("/jobs/") && pathname.includes("/edit")) return "Jobs / Edit";
    if (pathname.includes("/jobs")) return "Jobs";
    if (pathname.includes("/offices")) return "Offices";
    if (pathname.includes("/imports")) return "Data Import";
    if (pathname.includes("/verification")) return "Candidate Verification";
    if (pathname.includes("/settings")) return "Settings";
    return "Dashboard";
  };

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 font-sans relative">
      {/* Authorization Holding Screen - prevents content flash and interaction during session verification */}
      {isVerifying && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 px-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 mb-4 shadow-lg shadow-indigo-600/10">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-white">Verifying Authorization</p>
          <p className="text-xs text-slate-400 mt-1">Checking secure administrator credentials...</p>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col w-64 border-r border-slate-800 bg-slate-900/90 backdrop-blur-md ${
          isVerifying ? "invisible pointer-events-none select-none" : ""
        }`}
        aria-hidden={isVerifying}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 text-white shadow-md shadow-indigo-500/20 font-bold">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-white block">
              Prabisha Tech Hub
            </span>
            <span className="text-[10px] font-semibold tracking-wide uppercase text-indigo-400 block -mt-0.5">
              Super Admin 
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30 shadow-xs"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-indigo-400" : "text-slate-400"}`} />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="h-3 w-3 ml-auto text-indigo-400" />}
              </Link>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="p-4 border-t border-slate-800 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-700">
              <User className="h-4 w-4" />
            </div>
            <div className="overflow-hidden">
              <span className="text-xs font-semibold text-white block truncate">
                {admin?.username || "Admin"}
              </span>
              <span className="text-[10px] text-emerald-400 block font-mono">
                Single Super Admin
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-indigo-400 transition"
              title="View Public Portal"
            >
              <span>Public Site</span>
              <ExternalLink className="h-3 w-3" />
            </Link>

            <button
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-rose-400 hover:text-rose-300 transition cursor-pointer"
              title="Log out session"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area - contains route children for instant navigation segment validation */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${
          isVerifying ? "invisible pointer-events-none select-none" : ""
        }`}
        aria-hidden={isVerifying}
      >
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Workspace /</span>
              <span className="text-xs font-semibold text-indigo-400">
                {getBreadcrumbTitle()}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition"
            >
              <span>Live Map</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </header>

        {/* Page Content: always rendered in DOM so segment is instant */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {!isVerifying && mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-64 max-w-xs bg-slate-900 border-r border-slate-800 p-4 flex flex-col z-10 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold">
                  <Shield className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Admin Menu
                </span>
              </div>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 py-4 space-y-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/admin/dashboard" && pathname.startsWith(item.href));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold ${
                      isActive
                        ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/30"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="pt-3 border-t border-slate-800 space-y-2">
              <button
                onClick={() => {
                  setMobileSidebarOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminAuthProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </AdminAuthProvider>
  );
}
