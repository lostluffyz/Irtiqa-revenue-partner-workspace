# Liquid Glass + Dark Mode Implementation Plan

**Revenue Partner Workspace — Irtiqa AI**
**Date:** 2026-07-18 | **Status:** Ready for Execution

---

## Architecture Decision: @theme vs :root for Glass Tokens

### Recommendation: Hybrid Approach

Use **both** `@theme` and separate `:root`/`.dark` custom properties, divided by concern:

| Layer | Mechanism | Reason |
|---|---|---|
| **Color palette** (surface-50..900, primary-50..900) | `@theme` in globals.css | Already exists; generates Tailwind utilities |
| **Semantic tokens** (bg, text, border) | `@theme` in globals.css | Enables `bg-card`, `text-card-foreground` utilities |
| **Glass material tokens** (fill, blur, highlight) | `:root` + `.dark` CSS vars | Raw CSS values for backdrop-filter, box-shadow |
| **Motion tokens** (duration, easing) | `:root` CSS vars | Used via arbitrary values in transition classes |
| **Elevation shadows** | `@theme` in globals.css | Generates `shadow-glass-sm`..`xl` utilities |

**Why hybrid?** `@theme` generates Tailwind utilities (colors, shadows). But glass tokens with multi-value `backdrop-filter: blur(24px) saturate(140%)` cannot be expressed as utilities — they need raw CSS. And `@theme` does not support per-variant definitions; `.dark` class overrides need separate CSS selectors.

---

## File Inventory

### Phase 1: Global Material System (8 files)

| # | File | Action | Description |
|---|---|---|---|
| 1 | `src/app/globals.css` | MODIFY | Semantic tokens, glass vars, motion tokens, dark mode, utility classes |
| 2 | `src/lib/theme-provider.tsx` | CREATE | Theme context, localStorage, system preference |
| 3 | `src/app/layout.tsx` | MODIFY | suppressHydrationWarning, ThemeProvider, inline script |
| 4 | `src/components/ui/button.tsx` | MODIFY | Clay primary, glass secondary, dark mode, hover motion |
| 5 | `src/components/ui/card.tsx` | MODIFY | glass-medium, semantic text tokens, hover-lift |
| 6 | `src/components/ui/badge.tsx` | MODIFY | Glass tint backgrounds, dark mode colors |
| 7 | `src/components/ui/input.tsx` | MODIFY | glass-subtle fill, semantic tokens, transitions |
| 8 | `src/components/ui/select.tsx` | MODIFY | Same treatment as input |

### Phase 2: App Shell + Admin Dashboard (4 files)

| # | File | Action | Description |
|---|---|---|---|
| 9 | `src/components/layout/admin-shell.tsx` | MODIFY | Floating glass sidebar, liquid nav, ambient bg |
| 10 | `src/components/layout/partner-shell.tsx` | MODIFY | Same glass sidebar treatment |
| 11 | `src/app/(dashboard)/admin/page.tsx` | MODIFY | Glass KPI cards, glass hero, glass tables |
| 12 | `src/app/(auth)/login/page.tsx` | MODIFY | Glass inputs, clay submit button, ambient glow |

**Phase 3 (FUTURE, NOT in this plan):** All remaining ~20 page files.

---

## Phase 1: Global Material System

---

### File 1: `src/app/globals.css`

This is the foundation. Replace the entire file.

#### Section 1: @theme — Existing palettes + new semantic tokens

Keep existing `--color-primary-*` and `--color-surface-*` unchanged. Add semantic tokens inside `@theme`:

```css
@import "tailwindcss";

@theme {
  /* ── Brand: Irtiqa Electric Blue (UNCHANGED) ── */
  --color-primary-50: #eef1fe;
  --color-primary-100: #dde4fc;
  --color-primary-200: #b3c3f7;
  --color-primary-300: #7a95f0;
  --color-primary-400: #4168ea;
  --color-primary-500: #2265F7;
  --color-primary-600: #1641F5;
  --color-primary-700: #1551D6;
  --color-primary-800: #123aab;
  --color-primary-900: #0f2d8a;

  /* ── Warm Surface Palette (UNCHANGED) ── */
  --color-surface-50: #FAF8F5;
  --color-surface-100: #F4F3EE;
  --color-surface-200: #E8E4DE;
  --color-surface-300: #D4CFC7;
  --color-surface-400: #A8A29E;
  --color-surface-500: #78716C;
  --color-surface-600: #57534E;
  --color-surface-700: #44403C;
  --color-surface-800: #292524;
  --color-surface-900: #0C0C0B;

  /* ── NEW: Semantic tokens (theme-aware) ── */
  --color-bg: #FAF8F5;
  --color-bg-elevated: #FFFFFF;
  --color-bg-subtle: #F4F3EE;
  --color-card: #FFFFFF;
  --color-card-foreground: #0C0C0B;
  --color-text-primary: #0C0C0B;
  --color-text-secondary: #78716C;
  --color-text-muted: #A8A29E;
  --color-border: #E8E4DE;
  --color-border-subtle: #F4F3EE;

  /* ── Typography (UNCHANGED) ── */
  --font-display: var(--font-playfair), Georgia, "Times New Roman", serif;
  --font-sans: var(--font-geist-sans), system-ui, -apple-system, sans-serif;

  /* ── NEW: Glass elevation shadow scale ── */
  --shadow-glass-sm: 0 1px 2px rgba(0,0,0,0.04), 0 1px 3px rgba(0,0,0,0.03);
  --shadow-glass-md: 0 2px 8px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04);
  --shadow-glass-lg: 0 4px 16px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.06);
  --shadow-glass-xl: 0 8px 32px rgba(0,0,0,0.10), 0 16px 64px rgba(0,0,0,0.08);
}
```

#### Section 2: :root — Glass material tokens + motion tokens

These are NOT in @theme because they are consumed as raw CSS values in backdrop-filter, box-shadow, etc.

```css
/* ── Glass: Light mode ── */
:root {
  /* Glass fills */
  --glass-fill: rgba(255, 255, 255, 0.62);
  --glass-fill-heavy: rgba(255, 255, 255, 0.78);
  --glass-fill-light: rgba(255, 255, 255, 0.45);
  --glass-fill-ultra-light: rgba(255, 255, 255, 0.25);

  /* Glass borders */
  --glass-border: rgba(255, 255, 255, 0.60);
  --glass-border-subtle: rgba(255, 255, 255, 0.35);

  /* Glass internal highlight (inset top edge) */
  --glass-highlight: rgba(255, 255, 255, 0.60);

  /* Glass backdrop filter values */
  --glass-blur: 24px;
  --glass-blur-heavy: 32px;
  --glass-blur-light: 18px;
  --glass-saturate: 140%;

  /* Glass tint overlays (active nav, selection states) */
  --glass-tint-primary: rgba(22, 65, 245, 0.08);
  --glass-tint-primary-strong: rgba(22, 65, 245, 0.14);
  --glass-tint-success: rgba(16, 185, 129, 0.08);
  --glass-tint-warning: rgba(245, 158, 11, 0.08);
  --glass-tint-danger: rgba(239, 68, 68, 0.08);

  /* Motion timing */
  --duration-fast: 140ms;
  --duration-normal: 240ms;
  --duration-slow: 400ms;
  --duration-page-enter: 350ms;

  /* Motion easing */
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1);
  --ease-spring: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);

  /* Ambient background gradient */
  --ambient-gradient: radial-gradient(
    ellipse 80% 50% at 50% -20%,
    rgba(22, 65, 245, 0.05),
    transparent
  );
}
```

#### Section 3: .dark — Dark mode overrides

Override BOTH @theme semantic tokens AND :root glass vars via the `.dark` class on `<html>`:

```css
.dark {
  /* ── Semantic color overrides (these override @theme vars) ── */
  --color-bg: #08090B;
  --color-bg-elevated: #101216;
  --color-bg-subtle: #0D0E12;
  --color-card: #12141A;
  --color-card-foreground: #E8E5E0;
  --color-text-primary: #E8E5E0;
  --color-text-secondary: #9C9890;
  --color-text-muted: #6B6560;
  --color-border: rgba(255, 255, 255, 0.10);
  --color-border-subtle: rgba(255, 255, 255, 0.06);

  /* ── Glass fills — dark ── */
  --glass-fill: rgba(18, 20, 26, 0.62);
  --glass-fill-heavy: rgba(18, 20, 26, 0.78);
  --glass-fill-light: rgba(18, 20, 26, 0.45);
  --glass-fill-ultra-light: rgba(18, 20, 26, 0.25);

  /* ── Glass borders — dark ── */
  --glass-border: rgba(255, 255, 255, 0.12);
  --glass-border-subtle: rgba(255, 255, 255, 0.07);

  /* ── Glass highlights — dark ── */
  --glass-highlight: rgba(255, 255, 255, 0.08);

  /* ── Glass tints — dark (stronger for contrast) ── */
  --glass-tint-primary: rgba(22, 65, 245, 0.15);
  --glass-tint-primary-strong: rgba(22, 65, 245, 0.22);
  --glass-tint-success: rgba(16, 185, 129, 0.12);
  --glass-tint-warning: rgba(245, 158, 11, 0.12);
  --glass-tint-danger: rgba(239, 68, 68, 0.12);

  /* ── Shadow overrides — deeper for dark surfaces ── */
  --shadow-glass-sm: 0 1px 2px rgba(0,0,0,0.20), 0 1px 3px rgba(0,0,0,0.15);
  --shadow-glass-md: 0 2px 8px rgba(0,0,0,0.25), 0 4px 16px rgba(0,0,0,0.20);
  --shadow-glass-lg: 0 4px 16px rgba(0,0,0,0.30), 0 8px 32px rgba(0,0,0,0.25);
  --shadow-glass-xl: 0 8px 32px rgba(0,0,0,0.35), 0 16px 64px rgba(0,0,0,0.30);

  /* ── Ambient gradient — stronger in dark ── */
  --ambient-gradient: radial-gradient(
    ellipse 80% 50% at 50% -20%,
    rgba(22, 65, 245, 0.10),
    transparent
  );
}
```

#### Section 4: Base styles — theme-aware body + selection + scrollbar + focus

```css
html {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-geist-sans), system-ui, -apple-system, sans-serif;
  background-color: var(--color-bg);
  color: var(--color-text-primary);
  transition: background-color var(--duration-slow) var(--ease-smooth),
              color var(--duration-slow) var(--ease-smooth);
}

::selection {
  background-color: var(--glass-tint-primary-strong);
  color: var(--color-text-primary);
}

/* Scrollbar — theme-aware */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background-color: var(--color-border);
  border-radius: 9999px;
}
::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-text-muted);
}

/* Focus — theme-aware */
*:focus-visible {
  outline: 2px solid var(--color-primary-600);
  outline-offset: 2px;
  border-radius: 4px;
}
```

#### Section 5: Glass utility classes (NEW — composable via cn())

```css
/* ── Glass Tier 1: Strong Glass ──
   Use: sidebar panels, modals, hero cards
   Blur: 32px | Fill: 0.78 | Border: 0.60 */
.glass-strong {
  background: var(--glass-fill-heavy);
  backdrop-filter: blur(var(--glass-blur-heavy)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur-heavy)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border);
  box-shadow: inset 0 1px 0 var(--glass-highlight), var(--shadow-glass-md);
}

/* ── Glass Tier 2: Medium Glass ──
   Use: KPI cards, table containers, content panels
   Blur: 24px | Fill: 0.62 | Border: 0.60 */
.glass-medium {
  background: var(--glass-fill);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border);
  box-shadow: inset 0 1px 0 var(--glass-highlight), var(--shadow-glass-sm);
}

/* ── Glass Tier 3: Subtle Glass ──
   Use: inputs, dropdowns, mobile header, toggle tracks
   Blur: 18px | Fill: 0.45 | Border: 0.35 */
.glass-subtle {
  background: var(--glass-fill-light);
  backdrop-filter: blur(var(--glass-blur-light)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur-light)) saturate(var(--glass-saturate));
  border: 1px solid var(--glass-border-subtle);
  box-shadow: inset 0 1px 0 var(--glass-highlight), var(--shadow-glass-sm);
}

/* ── Glass Tier 4: Ultra-light ──
   Use: hover overlays, selection backgrounds
   Blur: 12px | Fill: 0.25 */
.glass-ultra-light {
  background: var(--glass-fill-ultra-light);
  backdrop-filter: blur(12px) saturate(120%);
  -webkit-backdrop-filter: blur(12px) saturate(120%);
  border: 1px solid var(--glass-border-subtle);
}

/* ── Glass: Tinted variants (for active states) ── */
.glass-tint-primary {
  background: var(--glass-tint-primary);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid rgba(22, 65, 245, 0.15);
}

.glass-tint-primary-strong {
  background: var(--glass-tint-primary-strong);
  backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  border: 1px solid rgba(22, 65, 245, 0.22);
}

/* ── No Glass (Minimalism tier — clean solid surfaces) ── */
.glass-none {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
}
```

#### Section 6: Claymorphism classes (NEW — sparse usage)

```css
/* ── Clay: Primary CTA buttons, small interactive elements ── */
.clay {
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.35),
    inset 0 -2px 0 rgba(0, 0, 0, 0.08),
    0 2px 4px rgba(0, 0, 0, 0.06),
    0 4px 12px rgba(0, 0, 0, 0.04);
}

.dark .clay {
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.06),
    inset 0 -2px 0 rgba(0, 0, 0, 0.15),
    0 2px 4px rgba(0, 0, 0, 0.20),
    0 4px 12px rgba(0, 0, 0, 0.15);
}

/* ── Clay Icon: KPI icon containers, theme switcher, toggles ── */
.clay-icon {
  border-radius: 14px;
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.40),
    inset 0 -2px 0 rgba(0, 0, 0, 0.06),
    0 3px 6px rgba(0, 0, 0, 0.06),
    0 6px 16px rgba(0, 0, 0, 0.04);
}

.dark .clay-icon {
  box-shadow:
    inset 0 2px 0 rgba(255, 255, 255, 0.06),
    inset 0 -2px 0 rgba(0, 0, 0, 0.18),
    0 3px 6px rgba(0, 0, 0, 0.25),
    0 6px 16px rgba(0, 0, 0, 0.18);
}
```

#### Section 7: Motion keyframes + utility classes (NEW)

```css
/* ── Page entrance: opacity 0→1, translateY(6px→0) ── */
@keyframes page-enter {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-page-enter {
  animation: page-enter var(--duration-page-enter) var(--ease-out-expo) both;
}

/* ── Fade in ── */
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fade-in {
  animation: fade-in var(--duration-normal) var(--ease-smooth) both;
}

/* ── Slide up ── */
@keyframes slide-up {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-slide-up {
  animation: slide-up var(--duration-normal) var(--ease-out-expo) both;
}

/* ── Hover lift: translateY(-2px), shadow escalates ── */
.hover-lift {
  transition: transform var(--duration-fast) var(--ease-spring),
              box-shadow var(--duration-fast) var(--ease-spring);
}
.hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-glass-lg);
}

/* ── Button hover: translateY(-1px), active: scale(0.98) ── */
.hover-button {
  transition: transform var(--duration-fast) var(--ease-spring),
              box-shadow var(--duration-fast) var(--ease-spring),
              background-color var(--duration-fast) var(--ease-smooth);
}
.hover-button:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-glass-md);
}
.hover-button:active {
  transform: translateY(0) scale(0.98);
  box-shadow: var(--shadow-glass-sm);
}
```

#### Section 8: prefers-reduced-motion (NEW)

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
  .hover-lift:hover,
  .hover-button:hover {
    transform: none !important;
  }
  .hover-button:active {
    transform: none !important;
  }
}
```

#### Section 9: Ambient background utility (NEW)

```css
.ambient-bg {
  position: relative;
}
.ambient-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--ambient-gradient);
  pointer-events: none;
  z-index: 0;
  border-radius: inherit;
}
```

---

### File 2: `src/lib/theme-provider.tsx` (NEW FILE)

Minimal, zero-dependency theme provider. Manages light/dark/system preference, persists to localStorage, applies `.dark` class to `<html>`.

**Design decisions:**
- `"use client"` directive required for useState/useEffect
- localStorage key: `"revenue-workspace-theme"`
- Values: `"light"`, `"dark"`, `"system"` (system = follow OS preference)
- Applies `"light"` or `"dark"` class to `document.documentElement`
- `mounted` guard prevents hydration mismatch (SSR renders without class, inline script in layout applies it before paint)

```tsx
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  try {
    const stored = localStorage.getItem("revenue-workspace-theme");
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch { /* localStorage unavailable */ }
  return "system";
}

function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
}

function resolveTheme(theme: Theme): "light" | "dark" {
  return theme === "system" ? getSystemTheme() : theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    const resolved = resolveTheme(newTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
    try {
      localStorage.setItem("revenue-workspace-theme", newTheme);
    } catch { /* localStorage unavailable */ }
  }, []);

  useEffect(() => {
    const stored = getStoredTheme();
    const resolved = resolveTheme(stored);
    setThemeState(stored);
    setResolvedTheme(resolved);
    applyTheme(resolved);
    setMounted(true);

    // Listen for system preference changes
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (getStoredTheme() === "system") {
        const newResolved = getSystemTheme();
        setResolvedTheme(newResolved);
        applyTheme(newResolved);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // During SSR / initial hydration, render children without theme class
  // The inline script in layout.tsx handles the initial class
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
```

---

### File 3: `src/app/layout.tsx`

**Changes:**
1. Add `suppressHydrationWarning` to `<html>` — required because inline script adds class on client that differs from SSR output
2. Add inline `<script>` in `<head>` — applies theme class BEFORE React hydration (prevents flash)
3. Wrap `{children}` in `<ThemeProvider>` — enables `useTheme()` in any client component
4. Remove hardcoded `bg-surface-50 text-surface-900` from `<body>` — now handled by `var(--color-bg)` / `var(--color-text-primary)` in the CSS body rule

```tsx
import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Playfair_Display } from "next/font/google";
import { ThemeProvider } from "@/lib/theme-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Revenue Partner Workspace — Irtiqa AI",
  description: "Revenue Partner Program portal for Irtiqa AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${playfair.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  try {
    var theme = localStorage.getItem('revenue-workspace-theme') || 'system';
    var resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    document.documentElement.classList.add(resolved);
  } catch(e) {}
})();
`.trim(),
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
```

---

### File 4: `src/components/ui/button.tsx`

**Glass tier assignment:**
- primary → claymorphism (`clay` class) + `hover-button`
- secondary → glass-subtle (tier 3) + `hover-button`
- danger → solid + `hover-button`
- ghost → minimalism (no glass) + ultra-light hover

**Modified variant styles:**

```tsx
const variantStyles: Record<Variant, string> = {
  primary: [
    "bg-primary-600 text-white shadow-sm",
    "hover:bg-primary-700",
    "focus:ring-primary-500",
    "clay hover-button",
  ].join(" "),
  secondary: [
    "glass-subtle text-card-foreground",
    "hover:bg-[var(--glass-fill)]",
    "focus:ring-primary-500",
    "hover-button",
  ].join(" "),
  danger: [
    "bg-red-600 text-white shadow-sm",
    "hover:bg-red-700",
    "focus:ring-red-500",
    "hover-button",
  ].join(" "),
  ghost: [
    "bg-transparent text-text-secondary",
    "hover:text-text-primary",
    "hover:bg-[var(--glass-fill-ultra-light)]",
    "focus:ring-primary-500",
  ].join(" "),
};
```

**Updated component body** — import `cn`, update transition class:

```tsx
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, disabled, className = "", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`inline-flex items-center justify-center gap-1.5 text-center font-medium transition-all duration-[var(--duration-fast)] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {/* spinner unchanged */}
        {children}
      </button>
    );
  },
);
```

**Changes from current:**
- `secondary`: `bg-white ring-1 ring-black/[0.06]` → `glass-subtle text-card-foreground`
- `ghost`: `text-surface-600 hover:bg-surface-100/60` → `text-text-secondary hover:text-text-primary hover:bg-[var(--glass-fill-ultra-light)]`
- All interactive variants get `hover-button` for translateY motion
- `primary` gets `clay` for claymorphism dimensional shadow
- Transition: `duration-150` → `duration-[var(--duration-fast)]`

---

### File 5: `src/components/ui/card.tsx`

**Glass tier: Medium glass (tier 2)**

```tsx
export function Card({ children, className = "", padding = "md" }: CardProps) {
  return (
    <div className={`glass-medium rounded-2xl ${paddings[padding]} ${className}`}>
      {children}
    </div>
  );
}
```

**CardHeader** — semantic tokens:
```tsx
<h3 className="text-base font-semibold text-card-foreground">{title}</h3>
<p className="mt-0.5 text-sm text-text-secondary">{description}</p>
```

**CardTitle** — semantic token:
```tsx
<h3 className={`text-base font-semibold text-card-foreground ${className}`}>{children}</h3>
```

**Key change:** `bg-white shadow-sm ring-1 ring-black/[0.04]` → `glass-medium rounded-2xl`. Consumer adds `hover-lift` via className: `<Card className="hover-lift">`.

---

### File 6: `src/components/ui/badge.tsx`

**Glass tier: Ultra-light (tier 4)** — badges are small, full backdrop-filter is overkill.

```tsx
const variants: Record<BadgeVariant, string> = {
  default: "bg-[var(--glass-fill-light)] text-text-secondary border border-[var(--glass-border-subtle)]",
  success: "bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-500/20",
  warning: "bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-500/20",
  danger: "bg-red-50 dark:bg-red-500/15 text-red-600 dark:text-red-400 border border-red-200/60 dark:border-red-500/20",
  info: "bg-blue-50 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-500/20",
};
```

**Rationale:** Badges are small enough that full glass backdrop-filter is overkill. Use `dark:bg-*/15` for a translucent tint in dark mode that matches the glass aesthetic without the performance cost.

---

### File 7: `src/components/ui/input.tsx`

**Glass tier: Subtle glass (tier 3)**

**Modified input element:**
```tsx
<input
  ref={ref}
  id={inputId}
  className={`block w-full rounded-xl glass-subtle px-3 py-2 text-[14px] shadow-sm transition-all duration-[var(--duration-fast)] placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 ${
    error
      ? "border-red-300 dark:border-red-500/50 focus:border-red-500 focus:ring-red-500/20"
      : "text-text-primary hover:border-[var(--glass-border)]"
  } disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
  {...props}
/>
```

**Label:** `text-[13px] font-medium text-text-secondary`
**Error:** `text-[12px] text-red-600 dark:text-red-400`
**Help:** `text-[12px] text-text-muted`

**Changes:** `border-surface-200 bg-white` → `glass-subtle`. `rounded-lg` → `rounded-xl`. `transition-colors` → `transition-all duration-[var(--duration-fast)]`.

---

### File 8: `src/components/ui/select.tsx`

**Identical treatment to input.tsx.** Glass tier: Subtle glass (tier 3).

Replace `bg-white` with `glass-subtle`, use semantic tokens for text/border, same dark mode pattern.

---

## Phase 2: App Shell + Admin Dashboard

---

### File 9: `src/components/layout/admin-shell.tsx`

**This is the most complex file.** The sidebar becomes a floating glass panel.

#### Glass tier assignments:

| Element | Glass Tier | Class |
|---|---|---|
| Sidebar panel | Strong (tier 1) | `glass-strong` |
| Mobile header | Subtle (tier 3) | `glass-subtle` |
| Mobile overlay backdrop | N/A | `bg-black/30 backdrop-blur-[4px]` |
| Nav active item | Tinted | `glass-tint-primary` |
| Nav hover item | Ultra-light (tier 4) | `bg-[var(--glass-fill-ultra-light)]` |
| Content area background | Ambient | `bg-bg ambient-bg` |

#### Shell container (outermost div):

**Before:** `<div className="flex h-screen overflow-hidden bg-surface-50">`
**After:** `<div className="relative flex h-screen overflow-hidden bg-bg ambient-bg">`

Changes: `bg-surface-50` → `bg-bg` (semantic, auto dark/light). Add `ambient-bg` for the subtle brand gradient overlay. Add `relative` for `::before` positioning.

#### Desktop sidebar wrapper:

**Before:** `<div className="hidden md:flex shrink-0">`
**After:** `<div className="hidden md:flex shrink-0 p-2">`

The `p-2` creates the gap between sidebar and viewport edge, making the sidebar float.

#### Sidebar `<aside>`:

**Before:**
```tsx
<aside className={`flex flex-col bg-white transition-all duration-300 ease-in-out ${
  collapsed ? "w-[68px]" : "w-[240px]"
}`}>
```

**After:**
```tsx
<aside className={`flex flex-col glass-strong rounded-2xl h-[calc(100vh-16px)] transition-all duration-[var(--duration-slow)] ease-[var(--ease-out-expo)] ${
  collapsed ? "w-[68px]" : "w-[240px]"
}`}>
```

`bg-white` → `glass-strong` (tier 1). Add `rounded-2xl` + `h-[calc(100vh-16px)]` for floating glass panel effect. Transition uses motion tokens.

#### Brand header divider:

**Before:** `border-b border-surface-100`
**After:** `border-b border-white/20 dark:border-white/5`

#### Nav items:

**Before:**
```tsx
className={`group relative mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
  isActive
    ? "bg-primary-50/80 text-primary-700"
    : "text-surface-500 hover:bg-surface-50 hover:text-surface-900"
} ${collapsed ? "justify-center px-2" : ""}`}
```

**After:**
```tsx
className={`group relative mb-0.5 flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all duration-[var(--duration-fast)] ease-[var(--ease-spring)] ${
  isActive
    ? "glass-tint-primary text-primary-700 dark:text-primary-300"
    : "text-text-muted hover:text-text-primary hover:bg-[var(--glass-fill-ultra-light)]"
} ${collapsed ? "justify-center px-2" : ""}`}
```

Active: `glass-tint-primary` → translucent blue glass capsule. Hover: ultra-light glass materializes. Motion: spring easing.

#### Active indicator bar:

Keep the existing `bg-primary-60` accent bar. Optional: add `dark:bg-primary-400` for brighter in dark mode.

#### Mobile header:

**Before:** `border-b border-surface-100 bg-white/80 backdrop-blur-sm`
**After:** `border-b border-white/20 dark:border-white/5 glass-subtle`

#### Mobile overlay backdrop:

**Before:** `bg-surface-900/20 backdrop-blur-[2px]`
**After:** `bg-black/30 backdrop-blur-[4px]`

#### Content area:

**Before:** `<div className="mx-auto max-w-[1120px] px-8 py-10">`
**After:** `<div className="mx-auto max-w-[1120px] px-8 py-10 animate-page-enter">`

#### Profile section divider:

**Before:** `border-t border-surface-100`
**After:** `border-t border-white/20 dark:border-white/5`

---

### File 10: `src/components/layout/partner-shell.tsx`

**Apply the EXACT SAME patterns as admin-shell.tsx.** The two shells are structurally identical with different nav items. Every CSS change listed for admin-shell.tsx applies identically here.

---

### File 11: `src/app/(dashboard)/admin/page.tsx`

**This is a server component** — no React hooks. Changes are purely CSS class updates.

#### Glass tier assignments:

| Element | Glass Tier | Class |
|---|---|---|
| Page container | Animation | `animate-page-enter` |
| Primary metric (dark hero) | Solid + hover | `hover-lift` |
| Secondary KPI cards | Medium (tier 2) | `glass-medium` + `hover-lift` |
| KPI icon containers | Claymorphism | `clay-icon` |
| Table containers | Medium (tier 2) | `glass-medium` + `hover-lift` |
| Empty states | Medium (tier 2) | `glass-medium` |
| Activity/Announcement lists | Medium (tier 2) | `glass-medium` + `hover-lift` |

#### Semantic token replacements (apply to entire file):

| Current | New |
|---|---|
| `text-surface-900` | `text-text-primary` |
| `text-surface-400` | `text-text-muted` |
| `text-surface-300` | `text-text-muted` |
| `bg-white shadow-sm ring-1 ring-black/[0.04]` | `glass-medium` |
| `bg-white p-10 text-center` | `glass-medium p-10 text-center` |
| `divide-y divide-surface-100` | `divide-y divide-white/10 dark:divide-white/5` |

#### Specific element changes:

**Page container:** Add `animate-page-enter` class.

**Hero section heading:** `text-surface-900` → `text-text-primary`. Section label: `text-primary-600` → `text-primary-600 dark:text-primary-400`.

**Primary metric card:** Add `hover-lift`. Optional: `dark:bg-primary-900/40` for subtle blue tint in dark mode.

**KPI icon containers:**
```tsx
// BEFORE
<div className="rounded-lg bg-emerald-50 p-2">
// AFTER
<div className="clay-icon bg-emerald-50 dark:bg-emerald-500/15 p-2">
```
Add `clay-icon` for claymorphism. Dark mode: translucent tinted backgrounds. Icon: `dark:text-emerald-400`. Repeat for all three (emerald, blue, amber).

**KPI stat numbers:** `text-surface-900` → `text-text-primary`.
**KPI labels:** `text-surface-400` → `text-text-muted`.

**Activity dot colors:**
```tsx
function getActivityColor(action: string) {
  if (action.includes("partner")) return "bg-primary-500 dark:bg-primary-400";
  if (action.includes("lead")) return "bg-purple-500 dark:bg-purple-400";
  if (action.includes("report")) return "bg-emerald-500 dark:bg-emerald-400";
  return "bg-surface-400 dark:bg-surface-500";
}
```

**"View all" links:** `text-primary-600` → `text-primary-600 dark:text-primary-400`. `hover:text-primary-700` → `hover:text-primary-700 dark:hover:text-primary-300`.

---

### File 12: `src/app/(auth)/login/page.tsx`

#### Glass tier assignments:

| Element | Glass Tier | Class |
|---|---|---|
| Outer container | Semantic bg | `bg-bg` |
| Left brand panel | Solid + ambient glow | Decorative blurred circles |
| Left brand icon | Claymorphism | `clay-icon` |
| Mode toggle track | Subtle (tier 3) | `glass-subtle` |
| Mode toggle active pill | Heavy fill | `glass-fill-heavy` |
| Input fields | Subtle (tier 3) | `glass-subtle` |
| Submit button | Claymorphism | `clay` + `hover-button` |
| Error box | Subtle tinted | `bg-red-50 dark:bg-red-500/10` |

#### Specific changes:

**Outer container:** `bg-surface-50` → `bg-bg`

**Left brand panel** — add ambient glow:
```tsx
<div className="hidden w-1/2 bg-surface-900 lg:flex lg:flex-col lg:justify-between p-12 relative overflow-hidden">
  {/* Ambient glow orbs */}
  <div className="absolute top-0 left-0 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
  <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary-400/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3" />
```

**Brand icon:** Add `clay-icon` class.

**Right panel heading:** `text-surface-900` → `text-text-primary`. Subtitle: `text-surface-400` → `text-text-secondary`.

**Mode toggle track:** `bg-surface-100` → `glass-subtle`.
**Active pill:** `bg-white text-surface-900` → `glass-fill-heavy text-text-primary`.
**Inactive text:** `text-surface-400 hover:text-surface-600` → `text-text-muted hover:text-text-secondary`.

**Input fields:**
```tsx
// BEFORE
className="block w-full rounded-lg border border-surface-200 bg-white px-3 py-2.5 text-[14px] text-surface-900 placeholder:text-surface-400 transition-colors hover:border-surface-300 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-2 focus:ring-offset-surface-50"
// AFTER
className="block w-full rounded-xl glass-subtle px-3 py-2.5 text-[14px] text-text-primary placeholder:text-text-muted transition-all duration-[var(--duration-fast)] hover:border-[var(--glass-border)] focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:ring-offset-2 focus:ring-offset-bg"
```

**Submit button:**
```tsx
// BEFORE
className="flex w-full items-center justify-center rounded-lg bg-surface-900 px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-all duration-150 hover:bg-surface-800 focus:outline-none focus:ring-2 focus:ring-surface-900 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
// AFTER
className="clay hover-button flex w-full items-center justify-center rounded-xl bg-surface-900 dark:bg-primary-600 px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm transition-all duration-[var(--duration-fast)] hover:bg-surface-800 dark:hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-surface-900 dark:focus:ring-primary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
```

**Error box:** `bg-red-50` → `bg-red-50 dark:bg-red-500/10`. `text-red-600` → `text-red-600 dark:text-red-400`. `ring-red-200/60` → `ring-red-200/60 dark:ring-red-500/20`.

**Footer:** `text-surface-300` → `text-text-muted`.

---

## CSS Patterns Reference — Quick Lookup

### Semantic Token Mapping

| Current Class | New Class | Usage |
|---|---|---|
| `bg-surface-50` | `bg-bg` | Page backgrounds |
| `bg-white` (cards) | `glass-medium` | Card surfaces |
| `bg-white` (inputs) | `glass-subtle` | Input/select surfaces |
| `text-surface-900` | `text-text-primary` | Primary text |
| `text-surface-400/500` | `text-text-secondary` | Secondary text |
| `text-surface-300` | `text-text-muted` | Muted/label text |
| `border-surface-100/200` | `border-border` | Standard borders |
| `shadow-sm ring-1 ring-black/[0.04]` | `glass-medium` | Card shadow/border |

### Dark Mode Token Mapping

| Token | Light | Dark |
|---|---|---|
| `--color-bg` | #FAF8F5 | #08090B |
| `--color-bg-elevated` | #FFFFFF | #101216 |
| `--color-card` | #FFFFFF | #12141A |
| `--color-text-primary` | #0C0C0B | #E8E5E0 |
| `--color-text-secondary` | #78716C | #9C9890 |
| `--color-text-muted` | #A8A29E | #6B6560 |
| `--glass-fill` | rgba(255,255,255,0.62) | rgba(18,20,26,0.62) |
| `--glass-border` | rgba(255,255,255,0.60) | rgba(255,255,255,0.12) |

### Glass Tier Usage Guide

| Tier | Class | Use On | Blur | Fill Opacity |
|---|---|---|---|---|
| **Strong** | `glass-strong` | Sidebar, modals | 32px | 0.78 |
| **Medium** | `glass-medium` | Cards, tables, KPI cards | 24px | 0.62 |
| **Subtle** | `glass-subtle` | Inputs, toggle tracks, mobile header | 18px | 0.45 |
| **Ultra-light** | `glass-ultra-light` | Hover backgrounds, selections | 12px | 0.25 |
| **None** | `glass-none` | Clean solid surfaces | -- | solid |

### Claymorphism Usage Guide

| Element | Class | Where Used |
|---|---|---|
| Primary CTA buttons | `clay` | Submit buttons, primary actions |
| KPI icon containers | `clay-icon` | Dashboard stat icons |
| Theme switcher | `clay` | (Phase 3) |
| Toggles | `clay` | (Phase 3) |

### Motion Usage Guide

| Class | Effect | Timing | Easing |
|---|---|---|---|
| `animate-page-enter` | fade + translateY(6px->0) | 350ms | expo |
| `hover-lift` | translateY(-2px) + shadow | 140ms | spring |
| `hover-button` | translateY(-1px), active: scale(0.98) | 140ms | spring |
| `animate-fade-in` | opacity 0->1 | 240ms | smooth |
| `animate-slide-up` | opacity + translateY(8px->0) | 240ms | expo |

---

## Implementation Sequence

### Step 1: globals.css (all sections)
Write the complete new globals.css. This is the foundation; everything else depends on it.

### Step 2: theme-provider.tsx (new file)
Create the theme provider. No dependencies on other changes.

### Step 3: layout.tsx
Add suppressHydrationWarning, inline script, ThemeProvider wrapper.

### Step 4: Verify light mode
At this point, with NO component changes, the app should look identical to before (minus body background now using `var(--color-bg)` instead of hardcoded `#FAF8F5`). Run `npm run dev` and verify.

### Step 5: UI primitives (button, card, badge, input, select)
Update all 5 UI components. These are self-contained. Verify in browser.

### Step 6: Test dark mode toggle
Add a temporary theme toggle button somewhere (e.g., in admin-shell header) to switch between light/dark. Verify the glass system works in both modes.

### Step 7: admin-shell.tsx
Apply the full glass sidebar treatment. This is the most complex change. Verify sidebar float, liquid capsule, collapse/expand, mobile overlay, dark mode.

### Step 8: partner-shell.tsx
Apply identical treatment.

### Step 9: admin/page.tsx
Apply glass to KPI cards, hero, tables, activity panels. Verify entrance animation, hover lift, claymorphism, dark mode.

### Step 10: login/page.tsx
Apply glass to form inputs, mode toggle, submit button. Verify split layout, glass inputs, clay button, ambient glows.

### Step 11: Remove temporary theme toggle
Replace with proper ThemeSwitcher component (or defer to Phase 3).

---

## Verification Checklist

After completing Phase 2, verify:

- [ ] Light mode: sidebar is floating glass (gap between sidebar and viewport edges visible)
- [ ] Light mode: sidebar has translucent fill with inset highlight
- [ ] Light mode: active nav item shows translucent blue capsule
- [ ] Light mode: hover on nav items shows subtle glass background
- [ ] Light mode: KPI cards have glass appearance
- [ ] Light mode: page entrance animation plays on dashboard load
- [ ] Light mode: card hover lifts smoothly (translateY -2px)
- [ ] Light mode: button hover shows translateY(-1px)
- [ ] Light mode: button active shows scale(0.98)
- [ ] Light mode: login inputs have subtle glass background
- [ ] Light mode: login submit button has claymorphism shadow
- [ ] Light mode: ambient gradient visible at top of content area
- [ ] Dark mode: background is near-black (#08090B), NOT pure black
- [ ] Dark mode: sidebar glass is dark translucent (not solid dark)
- [ ] Dark mode: text is soft near-white (#E8E5E0), NOT pure #FFFFFF
- [ ] Dark mode: brand blue (#1641F5) retained and visible
- [ ] Dark mode: KPI cards have dark glass appearance
- [ ] Dark mode: inputs have dark glass background
- [ ] Dark mode: active nav has dark blue-tinted glass capsule
- [ ] Dark mode: login left panel ambient glows visible
- [ ] Dark mode: login submit button is blue (not dark-on-dark)
- [ ] Theme toggle persists across page reloads
- [ ] Theme toggle does not cause hydration error
- [ ] No flash of wrong theme on initial page load
- [ ] prefers-reduced-motion disables all animations
- [ ] Sidebar collapse/expand animation is smooth
- [ ] Mobile sidebar overlay has backdrop blur

---

## Phase 3 Preview (FUTURE — NOT in this plan)

Remaining files to apply glass treatment:
- `src/components/ui/table.tsx` — glass table surfaces, dark mode dividers
- `src/components/ui/empty-state.tsx` — semantic token text
- `src/components/ui/form-error.tsx` — dark mode colors
- `src/components/shared/sign-out-button.tsx` — glass-secondary style
- All partner pages (leads, report, progress, announcements, resources)
- All admin pages (partners, leads, reports, activity, announcements, resources)
- Theme switcher component (Sun/Moon icon toggle in sidebar header)
- Ambient background refinements

Each follows the same patterns established in Phase 1-2.

---

## Performance Notes

- **Zero new JS dependencies** — no framer-motion, no animation libraries
- Theme provider: ~2KB gzipped
- Glass CSS classes: pure CSS, no runtime cost
- backdrop-filter: GPU-accelerated in all modern browsers
- prefers-reduced-motion: fully respected, zero animation for users who prefer it
- localStorage: theme persistence with no server roundtrip
- Inline theme script: prevents FOUC, runs synchronously before paint
