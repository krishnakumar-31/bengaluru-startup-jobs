"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAdminAuth } from "@/lib/admin-auth";

export default function AdminLoginPage() {
  const { login, admin, isLoading } = useAdminAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("expired")) {
        setError("Your administrator session has expired. Please sign in again.");
      }
    }
  }, []);

  if (admin && !isLoading) {
    return (
      <div className="min-h-screen flex flex-col justify-center items-center bg-slate-950 px-4 text-center">
        <Loader2 className="h-6 w-6 text-indigo-400 animate-spin mb-3" />
        <p className="text-xs text-slate-400">Authenticated session active. Redirecting to dashboard...</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Please enter both username and password.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login(username.trim(), password);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid administrator credentials";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-950 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Subtle SaaS grid backdrop pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:3rem_3rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md space-y-8">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-indigo-800 text-white shadow-xl shadow-indigo-500/20 font-bold">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Super Admin Portal
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Bengaluru Startup Jobs Map • Administrative Control Plane
            </p>
          </div>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
          {error && (
            <div className="mb-6 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Administrator Username
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300">
                  Password
                </label>
              </div>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-200 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit CTA */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 px-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/25 hover:bg-indigo-500 transition active:scale-98 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Super Admin</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Disclaimer */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500">
              Protected by cryptographic bcrypt hashing and same-origin HttpOnly cookies.
            </p>
          </div>
        </div>

        {/* Return to Public Website */}
        <div className="text-center">
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-indigo-400 transition"
          >
            ← Return to Bengaluru Startup Jobs Map
          </Link>
        </div>
      </div>
    </div>
  );
}
