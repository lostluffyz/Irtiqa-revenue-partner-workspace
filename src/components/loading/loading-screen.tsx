"use client";

import { useEffect, useRef } from "react";
import { LoadingLogo } from "./loading-logo";
import { LoadingProgress } from "./loading-progress";
import { LoadingMessages } from "./loading-messages";
import { useLoadingState } from "@/hooks/useLoadingState";

/**
 * LoadingScreen — Full-screen overlay during authentication and workspace loading.
 *
 * Architecture:
 * - Rendered at the root level (layout.tsx or AppProvider)
 * - Controlled by the loading-manager singleton
 * - Only mounts in the DOM when visible (performance optimization)
 * - Manages focus trap for accessibility
 * - Announces state changes via aria-live
 *
 * Design:
 * - Clean white background matching the canvas
 * - Centered logo with subtle glow
 * - Rotating status messages
 * - Thin indeterminate progress bar at the top
 * - Smooth fade in/out transitions
 * - Respects prefers-reduced-motion
 */
export function LoadingScreen() {
  const { isVisible, message } = useLoadingState();
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus management: trap focus in overlay, restore on hide
  useEffect(() => {
    if (isVisible) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      // Focus the overlay for screen reader users
      overlayRef.current?.focus();
    } else if (previousFocusRef.current) {
      previousFocusRef.current.focus();
      previousFocusRef.current = null;
    }
  }, [isVisible]);

  // Prevent body scroll when loading overlay is visible
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div
      ref={overlayRef}
      className="loading-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Loading workspace"
      tabIndex={-1}
    >
      {/* Top progress bar */}
      <LoadingProgress />

      {/* Center content */}
      <div className="loading-center">
        <LoadingLogo />

        {/* Product name */}
        <h1 className="mt-5 text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-1)] loading-text-fade">
          Revenue Partner
        </h1>

        {/* Dynamic status message */}
        <div className="mt-3">
          <LoadingMessages message={message} />
        </div>
      </div>

      {/* Bottom branding */}
      <p className="absolute bottom-8 text-[11px] text-[var(--text-3)]/40 tracking-wide">
        &copy; {new Date().getFullYear()} Irtiqa Intelligence
      </p>
    </div>
  );
}
