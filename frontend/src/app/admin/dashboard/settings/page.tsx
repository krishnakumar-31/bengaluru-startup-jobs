"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  KeyRound,
  Lock,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { useAdminAuth } from "@/lib/admin-auth";
import { adminChangePassword } from "@/lib/admin-api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function AdminSettingsPage() {
  const { admin, refreshProfile } = useAdminAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    try {
      setSaving(true);
      const res = await adminChangePassword(currentPassword, newPassword);
      setSuccess(
        `${res.message || "Password updated successfully."} Token version updated; previous sessions invalidated.`
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      refreshProfile();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-indigo-400" />
            Super Admin Security &amp; Settings
          </h2>
          <Badge variant="indigo" size="sm">
            Protected Session
          </Badge>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Manage the dedicated Single Super Admin account, rotate credentials, and inspect security parameters.
        </p>
      </div>

      {/* Account Info Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 space-y-5 shadow-xl">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Super Admin Account Information</h3>
            <p className="text-xs text-slate-400">
              Operating under strict Single Super Admin model. No secondary roles or candidate accounts exist.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block font-medium">Username</span>
            <span className="text-sm font-bold text-white font-mono">
              {admin?.username || "admin"}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block font-medium">Account Status</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Active &amp; Protected
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block font-medium">Last Login Timestamp</span>
            <span className="text-xs font-medium text-slate-300">
              {admin?.last_login_at
                ? new Date(admin.last_login_at).toLocaleString()
                : "Active current session"}
            </span>
          </div>
        </div>
      </div>

      {/* Security Architecture Overview */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 space-y-3.5 backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
          <ShieldAlert className="h-4 w-4" />
          <span>Active Security Protections &amp; Policy</span>
        </div>
        <ul className="text-xs text-slate-300 space-y-2.5 list-disc list-inside">
          <li>
            <strong>HttpOnly Session Cookies:</strong> Tokens are never accessible by JavaScript storage (no localStorage/sessionStorage), guarding against XSS attacks.
          </li>
          <li>
            <strong>Strict CSRF Verification:</strong> Every state-changing request (POST, PUT, PATCH, DELETE) validates double-submit anti-CSRF tokens.
          </li>
          <li>
            <strong>Brute-Force Rate Limiting:</strong> Automatic temporary lockout triggered after 5 consecutive failed login attempts.
          </li>
          <li>
            <strong>Session Revocation:</strong> Rotating your password updates the database <code className="text-indigo-400 font-mono text-[11px] bg-slate-800 px-1 py-0.5 rounded">token_version</code>, invalidating all existing sessions across devices immediately.
          </li>
        </ul>
      </div>

      {/* Change Password Form */}
      <form
        onSubmit={handlePasswordSubmit}
        className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 space-y-5 shadow-xl"
      >
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <KeyRound className="h-4 w-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-white">Rotate Super Admin Password</h3>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-rose-400 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-xs text-emerald-300 flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <div className="space-y-4 max-w-md">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Current Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="password"
                required
                placeholder="Enter existing password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Minimum 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="Re-type new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/60 pl-9 pr-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={saving}
              icon={<KeyRound className="h-4 w-4" />}
            >
              Update Super Admin Password
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
