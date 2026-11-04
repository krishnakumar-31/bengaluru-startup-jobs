"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  KeyRound,
  Lock,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { useAdminAuth } from "@/lib/admin-auth";
import { adminChangePassword } from "@/lib/admin-api";

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
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-emerald-400" />
          Super Admin Security & Settings
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Manage the dedicated Single Super Admin account, rotate credentials, and inspect security parameters.
        </p>
      </div>

      {/* Account Info Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <UserCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Super Admin Account Information</h3>
            <p className="text-xs text-slate-400">
              Operating under strict Single Super Admin model. No secondary roles or candidate accounts exist.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block">Username</span>
            <span className="text-sm font-semibold text-white">
              {admin?.username || "admin"}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block">Account Status</span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Active & Protected
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 space-y-1">
            <span className="text-[11px] text-slate-400 block">Last Login Time</span>
            <span className="text-xs font-medium text-slate-300">
              {admin?.last_login_at
                ? new Date(admin.last_login_at).toLocaleString()
                : "Active session"}
            </span>
          </div>
        </div>
      </div>

      {/* Security Architecture Overview */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
          <ShieldAlert className="h-4 w-4" />
          <span>Active Security Mechanisms</span>
        </div>
        <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
          <li>
            <strong>HttpOnly Session Cookies:</strong> Tokens are never exposed to JavaScript storage, guarding against XSS attacks.
          </li>
          <li>
            <strong>Strict CSRF Verification:</strong> Every state-changing request (POST, PUT, PATCH, DELETE) validates double-submit tokens.
          </li>
          <li>
            <strong>Brute-Force Rate Limiting:</strong> Automatic temporary lockout triggered after 5 consecutive failed login attempts.
          </li>
          <li>
            <strong>Session Revocation:</strong> Rotating your password updates the database <code className="text-emerald-400 font-mono text-[11px]">token_version</code>, invalidating any active sessions across devices.
          </li>
        </ul>
      </div>

      {/* Change Password Form */}
      <form
        onSubmit={handlePasswordSubmit}
        className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6 space-y-5 shadow-xl"
      >
        <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
          <KeyRound className="h-4 w-4 text-emerald-400" />
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
            <label className="text-xs font-semibold text-slate-300">
              Current Password <span className="text-emerald-400">*</span>
            </label>
            <input
              type="password"
              required
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              New Super Admin Password <span className="text-emerald-400">*</span>
            </label>
            <input
              type="password"
              required
              placeholder="Minimum 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Confirm New Password <span className="text-emerald-400">*</span>
            </label>
            <input
              type="password"
              required
              placeholder="Re-enter new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold hover:brightness-110 transition disabled:opacity-50 shadow-md shadow-emerald-500/20"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Updating Password...</span>
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                <span>Update Password</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
