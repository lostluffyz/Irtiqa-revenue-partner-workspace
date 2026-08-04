"use client";

import { useEffect } from "react";
import { hideLoading } from "@/lib/loading-manager";

/**
 * HideLoading — Hides the loading overlay when the dashboard mounts.
 *
 * Place this at the top of any page that should dismiss the loading overlay.
 * It calls hideLoading() once on mount, which is a no-op if the overlay
 * isn't currently visible.
 *
 * This is the bridge between the auth flow (which shows the overlay)
 * and the dashboard (which should be visible immediately).
 */
export function HideLoading() {
  useEffect(() => {
    // Small delay to ensure the page has fully rendered before hiding
    // This prevents any flash of the underlying content
    const timer = requestAnimationFrame(() => {
      hideLoading();
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  return null;
}
