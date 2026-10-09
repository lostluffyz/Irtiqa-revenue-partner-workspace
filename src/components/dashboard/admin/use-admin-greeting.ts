"use client";

import { useSyncExternalStore } from "react";
import { getAdminGreeting } from "@/components/dashboard/helpers";

function subscribe(): () => void {
  return () => {};
}

function getClientSnapshot(): string {
  // Browser-local hour. String snapshots compare by value, so this
  // never triggers a re-render loop.
  return getAdminGreeting();
}

function getServerSnapshot(): string | null {
  return null;
}

/**
 * useAdminGreeting — Time-of-day greeting in the viewer's browser timezone.
 *
 * Returns null on the server/first paint and the browser-local greeting
 * after hydration (no server/client mismatch possible). Callers render a
 * blank placeholder for null, so the UI never flashes a wrong greeting
 * like a hardcoded "Hello".
 *
 * Display-only. Unrelated to compliance deadlines or PROGRAM_TIMEZONE.
 */
export function useAdminGreeting(): string | null {
  return useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);
}
