"use client";

import { useState, useEffect } from "react";
import { LiveClock, LiveClockCompact } from "./live-utc-clock";

/**
 * SafeLiveClock — SSR-safe wrapper around LiveClock.
 *
 * Returns null on server and during initial client render.
 * Shows the clock only after mount, preventing hydration mismatches
 * caused by server/client time formatting differences.
 */
export function SafeLiveClock(props: React.ComponentProps<typeof LiveClock>) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <LiveClock {...props} />;
}

/**
 * SafeLiveClockCompact — SSR-safe wrapper around LiveClockCompact.
 */
export function SafeLiveClockCompact(props: React.ComponentProps<typeof LiveClockCompact>) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return <LiveClockCompact {...props} />;
}
