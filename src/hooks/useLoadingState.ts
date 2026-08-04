"use client";

import { useEffect, useState } from "react";
import {
  onLoadingChange,
  type LoadingState,
} from "@/lib/loading-manager";

/**
 * useLoadingState — Reactive hook for the full-screen loading overlay.
 *
 * Subscribes to the loading manager and re-renders on state changes.
 * Returns the current loading state for rendering the LoadingScreen.
 */
export function useLoadingState(): LoadingState {
  const [state, setState] = useState<LoadingState>({
    isVisible: false,
    message: "Authenticating...",
    isLoading: false,
    progress: null,
  });

  useEffect(() => {
    return onLoadingChange(setState);
  }, []);

  return state;
}
