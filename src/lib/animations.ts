/**
 * animations.ts — Centralized animation constants & variants.
 *
 * All motion values used across the app are defined here
 * to ensure consistency and easy global tuning.
 */

// ── Shared easing ──────────────────────────────────────
// Cubic-bezier used by Linear, Vercel, Stripe — smooth deceleration
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

// ── Page transitions ──────────────────────────────────
export const PAGE_TRANSITION = {
  exit: { opacity: 0, y: -4 },
  enter: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2, ease: EASE_OUT_EXPO },
} as const;

export const PAGE_EXIT_TRANSITION = {
  duration: 0.12,
  ease: "easeOut" as const,
};

// ── Card stagger ──────────────────────────────────────
export const STAGGER_CHILDREN = 0.025; // 25ms between items
export const STAGGER_ITEM = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  transition: { duration: 0.2, ease: EASE_OUT_EXPO },
};

// ── Table rows ────────────────────────────────────────
export const TABLE_ROW_STAGGER = 0.03; // 30ms between rows
export const TABLE_ROW = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  transition: { duration: 0.18, ease: "easeOut" as const },
};

// ── Sidebar nav pill ──────────────────────────────────
export const NAV_PILL_TRANSITION = {
  duration: 0.2,
  ease: EASE_OUT_EXPO,
};

// ── Tab underline ─────────────────────────────────────
export const TAB_TRANSITION = {
  duration: 0.2,
  ease: EASE_OUT_EXPO,
};

// ── Animated number (KPI count-up) ────────────────────
export const NUMBER_DURATION_MS = 400;
export const NUMBER_SPRING = {
  bounce: 0,
};

// ── Dialog ────────────────────────────────────────────
export const DIALOG_OVERLAY = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.15, ease: "easeOut" as const },
};

export const DIALOG_PANEL = {
  initial: { opacity: 0, scale: 0.96, y: 4 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: 4 },
  transition: { duration: 0.2, ease: EASE_OUT_EXPO },
};

// ── Toast ─────────────────────────────────────────────
export const TOAST_ENTER = {
  initial: { opacity: 0, y: 16, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.2, ease: EASE_OUT_EXPO },
};

export const TOAST_EXIT = {
  exit: { opacity: 0, y: -8, scale: 0.95 },
  transition: { duration: 0.15, ease: "easeOut" as const },
};

// ── Reduced motion override ───────────────────────────
// Pass this to any motion component's `transition` when
// reduced motion is preferred. Sets duration to 0.
export const REDUCED_MOTION_TRANSITION = { duration: 0 };
