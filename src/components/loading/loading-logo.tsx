"use client";

import Image from "next/image";

/**
 * LoadingLogo — Centered Revenue Partner logo with optional subtle glow.
 *
 * Features:
 * - Uses the existing Irtiqa transparent logo
 * - Soft radial glow behind the logo
 * - Subtle fade-in animation
 * - Respects prefers-reduced-motion
 */
export function LoadingLogo() {
  return (
    <div className="relative flex items-center justify-center">
      {/* Subtle glow behind logo */}
      <div
        className="absolute w-[120px] h-[120px] rounded-full loading-logo-glow"
        aria-hidden="true"
      />

      {/* Logo */}
      <div className="relative z-10">
        <Image
          src="/irtiqa-logo-transparent.png"
          alt="Irtiqa AI"
          width={56}
          height={56}
          className="h-[56px] w-auto loading-logo-fade"
          unoptimized
          priority
        />
      </div>
    </div>
  );
}
