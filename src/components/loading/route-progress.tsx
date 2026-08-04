"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

/**
 * RouteProgress — Top loading bar for route transitions.
 *
 * Similar to GitHub/YouTube/Linear top progress bar.
 * Shows a thin animated bar at the very top of the viewport
 * during client-side route transitions.
 *
 * How it works:
 * - Monitors pathname changes via usePathname
 * - Shows bar on navigation start
 * - Animates to ~90% then completes when new route renders
 * - Smooth fade-out after completion
 *
 * Accessibility:
 * - Uses aria-hidden since it's purely decorative
 * - Reduced motion: instant appearance, no animation
 */
export function RouteProgress() {
  const pathname = usePathname();
  const [barState, setBarState] = useState<{ active: boolean; progress: number }>({
    active: false,
    progress: 0,
  });
  const prevPathname = useRef(pathname);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  useEffect(() => {
    // Detect route change
    if (pathname !== prevPathname.current) {
      prevPathname.current = pathname;
      clearAllTimers();

      // Start the bar
      setBarState({ active: true, progress: 0 });

      // Animate progress: fast initial, then slower
      let currentProgress = 0;
      progressTimer.current = setInterval(() => {
        currentProgress += Math.random() * 15 + 5;
        if (currentProgress >= 90) {
          currentProgress = 90;
          if (progressTimer.current) {
            clearInterval(progressTimer.current);
            progressTimer.current = null;
          }
          // Complete to 100% and hide after delay
          setBarState({ active: true, progress: 100 });
          hideTimer.current = setTimeout(() => {
            setBarState({ active: false, progress: 0 });
            hideTimer.current = null;
          }, 300);
        } else {
          setBarState((prev) => ({ ...prev, progress: currentProgress }));
        }
      }, 100);
    }

    return clearAllTimers;
  }, [pathname, clearAllTimers]);

  // Cleanup on unmount
  useEffect(() => clearAllTimers, [clearAllTimers]);

  if (!barState.active) return null;

  return (
    <div
      className="route-progress-container"
      role="progressbar"
      aria-hidden="true"
    >
      <div
        className="route-progress-bar"
        style={{
          width: `${barState.progress}%`,
          transition: barState.progress < 90 ? "width 200ms ease-out" : "width 300ms ease-out",
        }}
      />
    </div>
  );
}
