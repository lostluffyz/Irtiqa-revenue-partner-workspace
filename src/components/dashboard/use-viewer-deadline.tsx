"use client";

import { useEffect, useState } from "react";
import {
  formatDeadlineInTimezone,
  getViewerShortZoneName,
  getZoneAbbreviation,
  PROGRAM_TIMEZONE,
} from "@/components/dashboard/helpers";

/**
 * useViewerDueLine — Deadline rendered in the VIEWER's timezone.
 *
 * Returns null on the server/first paint (callers keep showing the
 * program-zone value), then resolves post-paint via rAF to e.g.
 * "7:00 PM GMT". Same hydration-safe pattern as useAdminGreeting:
 * SSR and first client render are identical, so no mismatch is possible.
 *
 * Display-only. The deadline calculation and its UTC basis are untouched.
 */
export function useViewerDueLine(utcHour: number, utcMinute: number): string | null {
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const viewerTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const time = formatDeadlineInTimezone(utcHour, utcMinute, viewerTz);
      setLine(`${time} ${getViewerShortZoneName(new Date(), viewerTz)}`);
    });
    return () => cancelAnimationFrame(frame);
  }, [utcHour, utcMinute]);

  return line;
}

/**
 * DueLine — Honestly labeled due time.
 *
 * First paint (and any non-JS render): the program-zone value with its
 * real abbreviation, e.g. "11:30 PM GMT+5:30" — never "your time".
 * After mount: the viewer's own local time and zone, e.g. "7:00 PM GMT".
 */
export function DueLine({ utcHour, utcMinute }: { utcHour: number; utcMinute: number }) {
  const viewerLine = useViewerDueLine(utcHour, utcMinute);
  if (viewerLine) return <>{viewerLine}</>;
  return (
    <>
      {formatDeadlineInTimezone(utcHour, utcMinute, PROGRAM_TIMEZONE)}{" "}
      {getZoneAbbreviation(PROGRAM_TIMEZONE)}
    </>
  );
}
