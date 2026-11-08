import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    positive?: boolean;
  };
  variant?: "light" | "dark";
  className?: string;
}

export function StatCard({
  label,
  value,
  subtext,
  icon,
  trend,
  variant = "light",
  className,
}: StatCardProps) {
  const isDark = variant === "dark";

  return (
    <div
      className={twMerge(
        clsx(
          "rounded-2xl border p-5 transition-all duration-200",
          isDark
            ? "border-slate-800 bg-slate-900/80 backdrop-blur-md hover:border-slate-700 shadow-md shadow-slate-950/20"
            : "border-slate-200/80 bg-white/90 backdrop-blur-sm shadow-sm hover:border-slate-300 hover:shadow-md",
          className
        )
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p
            className={clsx(
              "text-xs font-semibold uppercase tracking-wider",
              isDark ? "text-slate-400" : "text-slate-500"
            )}
          >
            {label}
          </p>
          <p
            className={clsx(
              "text-2xl sm:text-3xl font-black font-mono tracking-tight",
              isDark ? "text-white" : "text-slate-900"
            )}
          >
            {value}
          </p>
        </div>

        {icon && (
          <div
            className={clsx(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-xs",
              isDark
                ? "border-slate-700/80 bg-slate-800 text-indigo-400"
                : "border-slate-200 bg-slate-50 text-indigo-600"
            )}
          >
            {icon}
          </div>
        )}
      </div>

      {(subtext || trend) && (
        <div className="mt-3.5 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={clsx(
                "font-semibold",
                trend.positive ? "text-emerald-500" : "text-rose-500"
              )}
            >
              {trend.value}
            </span>
          )}
          {subtext && (
            <span className={clsx(isDark ? "text-slate-400" : "text-slate-600")}>
              {subtext}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
