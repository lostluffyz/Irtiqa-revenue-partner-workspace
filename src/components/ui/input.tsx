"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helpText, id, className = "", ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-[12px] font-medium text-[var(--text-2)]"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`input-field ${error ? "input-error" : ""} ${className}`}
          {...props}
        />
        {error && <p className="text-[12px] text-[var(--status-danger)]">{error}</p>}
        {helpText && !error && (
          <p className="text-[12px] text-[var(--text-3)]">{helpText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
