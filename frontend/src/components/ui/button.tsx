import React from "react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "emerald";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const variantStyles = {
      primary:
        "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 shadow-sm shadow-indigo-600/20 border-transparent focus-visible:ring-indigo-500",
      emerald:
        "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 shadow-sm shadow-emerald-600/20 border-transparent focus-visible:ring-emerald-500",
      secondary:
        "bg-slate-800 text-slate-100 hover:bg-slate-700 active:bg-slate-900 border-slate-700 focus-visible:ring-slate-500",
      outline:
        "bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 border-slate-300 shadow-sm focus-visible:ring-slate-400",
      ghost:
        "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-transparent focus-visible:ring-slate-400",
      danger:
        "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 shadow-sm shadow-rose-600/20 border-transparent focus-visible:ring-rose-500",
    };

    const sizeStyles = {
      sm: "px-2.5 py-1.5 text-xs rounded-lg gap-1.5 font-medium",
      md: "px-4 py-2 text-xs sm:text-sm rounded-xl gap-2 font-semibold",
      lg: "px-5 py-2.5 text-sm sm:text-base rounded-xl gap-2.5 font-semibold",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={twMerge(
          clsx(
            "inline-flex items-center justify-center border transition-all duration-150 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100",
            variantStyles[variant],
            sizeStyles[size],
            className
          )
        )}
        {...props}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
        ) : icon ? (
          <span className="shrink-0">{icon}</span>
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
