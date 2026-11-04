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

  // Loading gate
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Verifying Admin Session...
          </span>
        </div>
      </div>
    );
  }

  if (!admin) {
    return null; // Will redirect in AuthProvider
  }

  const navLinks = [
    { label: "Overview", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Companies", href: "/admin/dashboard/companies", icon: Building2 },
    { label: "Jobs", href: "/admin/dashboard/jobs", icon: Briefcase },
    { label: "Offices", href: "/admin/dashboard/offices", icon: MapPin },
    { label: "Data Import", href: "/admin/dashboard/imports", icon: UploadCloud },
    { label: "Verification", href: "/admin/dashboard/verification", icon: CheckCircle2 },
    { label: "Settings", href: "/admin/dashboard/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen flex bg-slate-950 text-slate-100 font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-800 bg-slate-900/90 backdrop-blur-md">
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 h-16 border-b border-slate-800">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 text-slate-950 shadow-md shadow-emerald-500/20 font-bold">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <span className="text-sm font-bold tracking-tight text-white block">
              BLR Tech Hub
            </span>
            <span className="text-[10px] font-medium tracking-wide uppercase text-emerald-400 block -mt-0.5">
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
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors ${
                  isActive
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-sm"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-emerald-400" : "text-slate-400"}`} />
                <span>{item.label}</span>
                {isActive && <ChevronRight className="h-3 w-3 ml-auto text-emerald-400" />}
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
                {admin.username}
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
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-emerald-400 transition"
              title="View Public Portal"
            >
              <span>Public Site</span>
              <ExternalLink className="h-3 w-3" />
            </Link>

            <button
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 text-[11px] text-rose-400 hover:text-rose-300 transition"
              title="Log out session"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md flex items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-400">Workspace /</span>
              <span className="text-xs font-semibold text-emerald-400">
                Bengaluru Startup Ecosystem
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>PostgreSQL Connected</span>
            </div>

            <Link
              href="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 text-xs font-medium text-slate-300 hover:bg-slate-700 transition"
            >
              <span>View Map</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative w-64 max-w-xs bg-slate-900 border-r border-slate-800 p-4 flex flex-col z-10">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500 text-slate-950 font-bold">
                  <Shield className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Admin Menu
                </span>
              </div>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
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
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "text-slate-400 hover:bg-slate-800/60"
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
                className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10"
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
