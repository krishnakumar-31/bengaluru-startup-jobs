import React from "react";
import { AlertCircle, RefreshCw, RotateCcw } from "lucide-react";
import { Button } from "./button";

export interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  variant?: "light" | "dark";
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  variant = "light",
}: EmptyStateProps) {
  const isDark = variant === "dark";

  return (
    <div
      className={`rounded-2xl border p-8 sm:p-12 text-center max-w-xl mx-auto ${
        isDark
          ? "border-slate-800 bg-slate-900/60 text-slate-300"
          : "border-slate-200 bg-white text-slate-600 shadow-sm"
      }`}
    >
      <div
        className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border ${
          isDark
            ? "border-slate-700 bg-slate-800 text-slate-400"
            : "border-slate-200 bg-slate-50 text-slate-500 shadow-xs"
        }`}
      >
        {icon || <AlertCircle className="h-6 w-6" />}
      </div>

      <h3
        className={`text-base sm:text-lg font-bold tracking-tight ${
          isDark ? "text-white" : "text-slate-900"
        }`}
      >
        {title}
      </h3>
      <p
        className={`mt-1.5 text-xs sm:text-sm max-w-sm mx-auto ${
          isDark ? "text-slate-400" : "text-slate-500"
        }`}
      >
        {description}
      </p>

      {(onAction || onSecondaryAction) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {onAction && actionLabel && (
            <Button
              variant="primary"
              size="sm"
              onClick={onAction}
              icon={<RefreshCw className="h-3.5 w-3.5" />}
            >
              {actionLabel}
            </Button>
          )}
          {onSecondaryAction && secondaryActionLabel && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSecondaryAction}
              icon={<RotateCcw className="h-3.5 w-3.5" />}
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
