"use client";

import Image from "next/image";

interface BrandProps {
  /** Text color variant */
  color?: "white" | "dark" | "muted";
  /** Overall brand size: sm = sidebar/compact, lg = login/hero */
  size?: "sm" | "lg";
  /** Hide the text (for collapsed sidebar) */
  hideText?: boolean;
  /** Additional classes on the wrapper */
  className?: string;
}

const TEXT_CLASSES = {
  white: "text-white",
  dark: "text-[var(--text-1)]",
  muted: "text-[var(--text-2)]",
} as const;

const BRAND_CONFIG = {
  sm: { logo: 36, logoClass: "h-9 w-auto", textClass: "text-[15px]" },
  lg: { logo: 52, logoClass: "h-[52px] w-auto", textClass: "text-[15px]" },
} as const;

export function Brand({
  color = "dark",
  size = "sm",
  hideText = false,
  className = "",
}: BrandProps) {
  const config = BRAND_CONFIG[size];

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Image
        src="/irtiqa-logo-transparent.png"
        alt="Irtiqa"
        width={config.logo}
        height={config.logo}
        className={config.logoClass}
        unoptimized
      />
      {!hideText && (
        <span
          className={`${config.textClass} font-semibold tracking-[-0.02em] ${TEXT_CLASSES[color]} whitespace-nowrap`}
        >
          Revenue Partner
        </span>
      )}
    </span>
  );
}
