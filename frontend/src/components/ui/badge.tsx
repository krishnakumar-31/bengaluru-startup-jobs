import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "secondary" | "success" | "warning" | "danger" | "indigo" | "outline";
  size?: "sm" | "md";
}

export function Badge({
  className,
  variant = "default",
  size = "md",
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    default: "bg-slate-100 text-slate-800 border-slate-200/80",
    secondary: "bg-slate-800/80 text-slate-300 border-slate-700/80",
    success: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
    warning: "bg-amber-50 text-amber-800 border-amber-200/80",
    danger: "bg-rose-50 text-rose-800 border-rose-200/80",
    indigo: "bg-indigo-50 text-indigo-800 border-indigo-200/80",
    outline: "bg-transparent text-slate-700 border-slate-300",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[10px] leading-tight font-medium rounded-md",
    md: "px-2.5 py-1 text-xs leading-normal font-medium rounded-lg",
  };

  return (
    <span
      className={twMerge(
        clsx(
          "inline-flex items-center gap-1.5 border transition-colors",
          variantStyles[variant],
          sizeStyles[size],
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  );
}
