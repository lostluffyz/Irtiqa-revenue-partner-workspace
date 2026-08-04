"use client";

import { type ReactNode } from "react";
import { RouteProgress } from "@/components/loading/route-progress";

/**
 * AppProviders — Root-level client providers.
 *
 * Wraps the entire application with:
 * - RouteProgress: Top loading bar for route navigation
 *
 * The loading experience during authentication is handled entirely
 * by the login page itself (form morphs into loading card).
 * No full-screen overlay needed.
 *
 * This is the only client boundary at the root level.
 * All providers here are lightweight and have zero initial render cost.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Route transition progress bar */}
      <RouteProgress />

      {/* Main application content */}
      {children}
    </>
  );
}
