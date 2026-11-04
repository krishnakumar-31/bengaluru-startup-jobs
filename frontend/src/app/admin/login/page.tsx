"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Shield, Lock, User, ArrowRight, AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAdminAuth } from "@/lib/admin-auth";

export default function AdminLoginPage() {
  const { login } = useAdminAuth();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      {/* Subtle radial backdrop pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(#059669_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.07] pointer-events-none" />

      <div className="relative w-full max-w-md space-y-8">
        {/* Header Branding */}
        <div className="text-center space-y-3">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-600 to-indigo-600 text-slate-950 shadow-xl shadow-emerald-500/20 font-bold">
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
                <User className="absolute left-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
                <Lock className="absolute left-3.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full rounded-xl border border-slate-700 bg-slate-800/80 py-2.5 pl-10 pr-10 text-sm text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-200"
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
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 px-4 text-sm font-semibold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-500 transition active:scale-98 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>Sign In as Super Admin</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Security Disclaimer */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <p className="text-[11px] text-slate-500">
              Authorized personnel only. Protected by cryptographic bcrypt hashing and HttpOnly session cookies.
            </p>
          </div>
        </div>

        {/* Return to Public Website */}
        <div className="text-center">
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-emerald-400 transition"
          >
            ← Return to Bengaluru Startup Jobs Map
          </Link>
        </div>
      </div>
    </div>
  );
}
