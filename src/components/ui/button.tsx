"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)] shadow-[0_1px_2px_rgba(0,0,0,0.08)] hover:shadow-[0_2px_6px_rgba(26,86,219,0.25)]",
  secondary:
    "border border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-[#D1D5DB] hover:bg-[var(--hover-bg)]",
  danger:
    "bg-[var(--status-danger)] text-white hover:bg-red-700 shadow-[0_1px_2px_rgba(0,0,0,0.08)]",
  ghost:
    "bg-transparent text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)]",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[13px] font-medium h-[32px] rounded-[8px]",
  md: "px-4 py-2 text-[13px] font-medium h-[36px] rounded-[8px]",
  lg: "px-5 py-2.5 text-[14px] font-medium h-[40px] rounded-[8px]",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, disabled, className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`btn-hover-lift inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 ease-out focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading && (
          <svg
            className="-ml-0.5 h-3.5 w-3.5 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
