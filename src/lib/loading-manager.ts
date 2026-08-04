/**
 * Loading Manager — Centralized loading state coordination.
 *
 * Coordinates the full-screen loading experience during authentication
 * and initial workspace loading. Manages message rotation and state transitions.
 *
 * Architecture:
 * - Singleton pattern via module-level state
 * - Observer pattern for reactive updates
 * - Message queue with intelligent timing
 */

type LoadingListener = (state: LoadingState) => void;

export interface LoadingState {
  /** Whether the full-screen loading overlay is visible */
  isVisible: boolean;
  /** Current loading message displayed to the user */
  message: string;
  /** Whether we're in the active loading phase */
  isLoading: boolean;
  /** Optional progress value (0-100) for determinate progress */
  progress: number | null;
}

const LOADING_MESSAGES = [
  "Authenticating...",
  "Verifying permissions...",
  "Loading workspace...",
  "Preparing dashboard...",
  "Fetching your data...",
  "Almost ready...",
] as const;

const MESSAGE_ROTATION_INTERVAL = 800; // ms between message changes
const MINIMUM_LOADING_TIME = 400; // ms — never flash the loading screen

let state: LoadingState = {
  isVisible: false,
  message: LOADING_MESSAGES[0],
  isLoading: false,
  progress: null,
};

const listeners: Set<LoadingListener> = new Set();
let messageTimer: ReturnType<typeof setInterval> | null = null;
let messageIndex = 0;
let loadingStartTime = 0;
let minimumTimer: ReturnType<typeof setTimeout> | null = null;
let resolveMinimumWait: (() => void) | null = null;

function notify() {
  listeners.forEach((listener) => listener({ ...state }));
}

function startMessageRotation() {
  stopMessageRotation();
  messageIndex = 0;
  messageTimer = setInterval(() => {
    messageIndex = (messageIndex + 1) % LOADING_MESSAGES.length;
    state = { ...state, message: LOADING_MESSAGES[messageIndex] };
    notify();
  }, MESSAGE_ROTATION_INTERVAL);
}

function stopMessageRotation() {
  if (messageTimer) {
    clearInterval(messageTimer);
    messageTimer = null;
  }
}

/**
 * Show the full-screen loading overlay.
 *
 * Sets a minimum display time so the overlay never flashes on fast connections.
 * Returns a function to hide the overlay.
 */
export function showLoading(initialMessage?: string): () => Promise<void> {
  if (state.isLoading) return hideLoading;

  loadingStartTime = Date.now();
  messageIndex = 0;
  state = {
    isVisible: true,
    isLoading: true,
    message: initialMessage || LOADING_MESSAGES[0],
    progress: null,
  };
  notify();
  startMessageRotation();

  // Enforce minimum display time
  return () =>
    new Promise<void>((resolve) => {
      const elapsed = Date.now() - loadingStartTime;
      const remaining = Math.max(0, MINIMUM_LOADING_TIME - elapsed);

      if (remaining > 0) {
        minimumTimer = setTimeout(() => {
          resolveMinimumWait = null;
          resolve();
        }, remaining);
        resolveMinimumWait = () => {
          clearTimeout(minimumTimer!);
          minimumTimer = null;
          resolveMinimumWait = null;
          resolve();
        };
      } else {
        resolve();
      }

      // Actually hide after enforcing minimum
      const doHide = async () => {
        if (remaining > 0) {
          await new Promise<void>((r) => {
            minimumTimer = setTimeout(r, remaining);
          });
        }
        stopMessageRotation();
        state = {
          ...state,
          isVisible: false,
          isLoading: false,
          progress: null,
        };
        notify();
      };

      // Chain onto the resolve
      if (remaining > 0) {
        setTimeout(doHide, remaining);
      } else {
        doHide();
      }
    });
}

/**
 * Hide the loading overlay.
 */
export async function hideLoading(): Promise<void> {
  if (resolveMinimumWait) {
    resolveMinimumWait();
  }
  stopMessageRotation();
  state = {
    ...state,
    isVisible: false,
    isLoading: false,
    progress: null,
  };
  notify();
}

/**
 * Update the loading message manually.
 */
export function setLoadingMessage(message: string): void {
  state = { ...state, message };
  notify();
}

/**
 * Subscribe to loading state changes.
 * Returns an unsubscribe function.
 */
export function onLoadingChange(listener: LoadingListener): () => void {
  listeners.add(listener);
  // Emit current state immediately
  listener({ ...state });
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Get current loading state (for non-reactive reads).
 */
export function getLoadingState(): LoadingState {
  return { ...state };
}
