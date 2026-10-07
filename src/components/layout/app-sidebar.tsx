"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { motion, LayoutGroup, useReducedMotion } from "motion/react";
import { ChevronsLeft, LogOut } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Target,
  FileText,
  Activity,
  Megaphone,
  BookOpen,
  CalendarCheck,
  Globe,
  TrendingUp,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════
   AppSidebar — floating admin sidebar (desktop rail + drawer)

   Animation safety: the active pill is decorative only. Every label,
   icon and the page content are fully visible by default CSS before
   any animation runs. Never AnimatePresence mode="wait" here.
   ══════════════════════════════════════════════════════════════ */

export interface SidebarNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: string | number }>;
}

export interface SidebarNavGroup {
  id: string;
  /** Null for the standalone top item (renders a divider instead). */
  title: string | null;
  items: SidebarNavItem[];
}

export interface AppSidebarProps {
  groups: SidebarNavGroup[];
  pathname: string;
  isActive: (href: string) => boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  user: { name: string; roleLabel: string; initial?: string };
  /** Subtitle under the brand name, e.g. "Admin console" or "Partner portal". */
  brandSubtitle: string;
  onSignOut: () => void;
  variant: "desktop" | "drawer";
  onNavigate?: () => void;
}

export const ADMIN_NAV_ACTIVE_LAYOUT_ID = "admin-nav-active";

const ACTIVE_PILL_SPRING = { type: "spring", stiffness: 380, damping: 34 } as const;

/** Role label shown under the admin name. Kept identical to the old shell. */
export function adminRoleLabel(adminName: string): string {
  return adminName.toLowerCase() === "administrator" ? "Admin" : "Administrator";
}

/** Partner navigation groups — same items, labels, hrefs and order as before. */
export const PARTNER_NAV_GROUPS: SidebarNavGroup[] = [
  {
    id: "overview",
    title: null,
    items: [{ href: "/partner", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    id: "manage",
    title: "Manage",
    items: [{ href: "/partner/leads", label: "My Leads", icon: Target }],
  },
  {
    id: "operate",
    title: "Operate",
    items: [
      { href: "/partner/report", label: "Daily Report", icon: FileText },
      { href: "/partner/progress", label: "Progress", icon: TrendingUp },
    ],
  },
  {
    id: "communicate",
    title: "Communicate",
    items: [
      { href: "/partner/announcements", label: "Announcements", icon: Megaphone },
      { href: "/partner/resources", label: "Resources", icon: BookOpen },
    ],
  },
];
/** Admin navigation groups — same items, labels, hrefs and order as before. */
export const ADMIN_NAV_GROUPS: SidebarNavGroup[] = [
  {
    id: "overview",
    title: null,
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    id: "manage",
    title: "Manage",
    items: [
      { href: "/admin/partners", label: "Partners", icon: Users },
      { href: "/admin/leads", label: "Leads", icon: Target },
    ],
  },
  {
    id: "operate",
    title: "Operate",
    items: [
      { href: "/admin/allocation", label: "Allocation", icon: CalendarCheck },
      { href: "/admin/scrape", label: "Lead Scraper", icon: Globe },
      { href: "/admin/reports", label: "Reports", icon: FileText },
      { href: "/admin/activity", label: "Activity", icon: Activity },
    ],
  },
  {
    id: "communicate",
    title: "Communicate",
    items: [
      { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
      { href: "/admin/resources", label: "Resources", icon: BookOpen },
    ],
  },
];

interface TipState {
  label: string;
  x: number;
  y: number;
}

export function AppSidebar({
  groups,
  pathname,
  isActive,
  collapsed,
  onToggleCollapsed,
  user,
  onSignOut,
  variant,
  onNavigate,
  brandSubtitle,
}: AppSidebarProps) {
  const prefersReduced = useReducedMotion();
  const navRef = useRef<HTMLElement>(null);
  const [tip, setTip] = useState<TipState | null>(null);

  // Keep the active page visible inside the scrollable nav on mount.
  // Manual scroll math only — never scrolls the page itself.
  useEffect(() => {
    if (variant !== "desktop") return;
    const container = navRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLElement>('[aria-current="page"]');
    if (!active) return;
    const cRect = container.getBoundingClientRect();
    const eRect = active.getBoundingClientRect();
    if (eRect.top < cRect.top) {
      container.scrollTop += eRect.top - cRect.top - 8;
    } else if (eRect.bottom > cRect.bottom) {
      container.scrollTop += eRect.bottom - cRect.bottom + 8;
    }
  }, [variant]);

  const showTip = (label: string, el: HTMLElement) => {
    const rect = el.getBoundingClientRect();
    setTip({
      label,
      x: rect.right + 10,
      y: Math.min(Math.max(rect.top + rect.height / 2, 28), window.innerHeight - 28),
    });
  };
  const hideTip = () => setTip(null);

  const rail = variant === "desktop" && collapsed;

  return (
    <aside
      className={
        variant === "drawer"
          ? "sidebar flex h-full w-full flex-col overflow-hidden"
          : "sidebar fixed bottom-3 left-3 top-3 z-[30] hidden w-[var(--sb-w)] flex-col overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-float)] transition-[width] duration-[220ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] md:flex"
      }
    >
      {/* ── Brand header (desktop only; drawer keeps its own brand row) ── */}
      {variant === "desktop" &&
        (rail ? (
          <div className="flex shrink-0 flex-col items-center gap-2 px-2 pb-2 pt-3">
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-[12px] bg-[var(--hover-bg)]">
              <Image
                src="/irtiqa-logo-transparent.png"
                alt=""
                width={36}
                height={36}
                className="h-6 w-6"
                unoptimized
              />
            </span>
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label="Expand sidebar"
              aria-expanded={false}
              title="Expand sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-3)] transition-colors duration-150 hover:bg-[var(--hover-bg)] hover:text-[var(--text-2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
            >
              <ChevronsLeft className="h-4 w-4 rotate-180 transition-transform duration-200" />
            </button>
          </div>
        ) : (
          <div className="flex h-16 shrink-0 items-center gap-3 px-4 py-3 pl-4 pr-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[12px] bg-[var(--hover-bg)]">
              <Image
                src="/irtiqa-logo-transparent.png"
                alt=""
                width={36}
                height={36}
                className="h-6 w-6"
                unoptimized
              />
            </span>
            <span className="min-w-0 flex-1 leading-tight">
              <span className="block truncate text-[15px] font-semibold text-[var(--text-1)]">
                Revenue Partner
              </span>
              <span className="block text-[11px] text-[var(--text-3)]">
                {brandSubtitle}
              </span>
            </span>
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-label="Collapse sidebar"
              aria-expanded={true}
              title="Collapse sidebar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-3)] transition-colors duration-150 hover:bg-[var(--hover-bg)] hover:text-[var(--text-2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2"
            >
              <ChevronsLeft className="h-4 w-4 transition-transform duration-200" />
            </button>
          </div>
        ))}

      {/* ── Navigation ── */}
      <nav
        ref={navRef}
        aria-label="Primary"
        className="app-nav-scroll min-h-0 flex-1 overflow-y-auto px-3 py-2"
      >
        <LayoutGroup>
          {groups.map((group) => (
            <div key={group.id}>
              {group.title ? (
                rail ? (
                  <div
                    aria-hidden="true"
                    className="mx-auto my-4 h-px w-6 bg-[var(--border)]"
                  />
                ) : (
                  <p className="mx-3 mb-1.5 mt-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-3)]">
                    {group.title}
                  </p>
                )
              ) : (
                <div aria-hidden="true" className="mx-2 mb-3 h-px bg-[var(--border-subtle)]" />
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const active =
                    pathname === item.href || isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      aria-label={item.label}
                      onClick={onNavigate}
                      onMouseEnter={
                        rail
                          ? (e) => showTip(item.label, e.currentTarget)
                          : undefined
                      }
                      onMouseLeave={rail ? hideTip : undefined}
                      onFocus={
                        rail
                          ? (e) => showTip(item.label, e.currentTarget)
                          : undefined
                      }
                      onBlur={rail ? hideTip : undefined}
                      className={`group relative flex h-11 items-center gap-3 rounded-[14px] text-[14px] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 ${
                        rail ? "justify-center px-0" : "px-3"
                      } ${
                        active
                          ? "bg-[var(--accent-tint)] font-medium text-[var(--accent)]"
                          : "font-medium text-[var(--text-2)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-1)]"
                      } active:scale-[0.98]`}
                    >
                      {active &&
                        (prefersReduced || variant === "drawer" ? (
                          <span
                            aria-hidden="true"
                            className="absolute inset-0 z-0 rounded-[14px] bg-[var(--accent-tint)]"
                          />
                        ) : (
                          <motion.span
                            aria-hidden="true"
                            layoutId={ADMIN_NAV_ACTIVE_LAYOUT_ID}
                            className="absolute inset-0 z-0 rounded-[14px] bg-[var(--accent-tint)]"
                            transition={ACTIVE_PILL_SPRING}
                          />
                        ))}
                      <item.icon
                        strokeWidth={1.75}
                        className={`relative z-10 h-5 w-5 shrink-0 transition-transform duration-150 group-hover:translate-x-[1px] group-hover:scale-[1.04] ${
                          active ? "text-[var(--accent)]" : "text-[var(--text-3)]"
                        }`}
                      />
                      <span
                        aria-hidden={false}
                        className={`relative z-10 whitespace-nowrap transition-opacity duration-150 ${
                          rail ? "w-0 overflow-hidden opacity-0" : "w-auto opacity-100"
                        }`}
                      >
                        {item.label}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </LayoutGroup>
      </nav>

      {/* ── Footer: user + sign out ── */}
      <div className="shrink-0 border-t border-[var(--border-subtle)] p-3">
        {rail ? (
          <div className="flex flex-col items-center gap-2">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[var(--hover-bg)] text-[13px] font-semibold text-[var(--text-2)]"
              onMouseEnter={(e) => showTip(user.name, e.currentTarget)}
              onMouseLeave={hideTip}
              onFocus={(e) => showTip(user.name, e.currentTarget)}
              onBlur={hideTip}
            >
              {user.initial ?? user.name.charAt(0).toUpperCase()}
            </span>
            <button
              type="button"
              onClick={onSignOut}
              aria-label="Sign out"
              onMouseEnter={(e) => showTip("Sign out", e.currentTarget)}
              onMouseLeave={hideTip}
              onFocus={(e) => showTip("Sign out", e.currentTarget)}
              onBlur={hideTip}
              className="flex h-11 w-11 items-center justify-center rounded-[14px] text-[var(--text-3)] transition-colors duration-150 hover:bg-[var(--hover-bg)] hover:text-[var(--text-2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 active:scale-[0.98]"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2.5 rounded-[18px] bg-[var(--hover-bg)] p-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[12px] bg-[var(--surface)] text-[13px] font-semibold text-[var(--text-2)]">
                {user.initial ?? user.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[13px] font-semibold text-[var(--text-1)]">
                  {user.name}
                </span>
                <span className="mt-0.5 inline-block rounded-full bg-[var(--surface)] px-2 py-px text-[11px] font-medium text-[var(--text-2)]">
                  {user.roleLabel}
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={onSignOut}
              className="mt-2 flex h-11 w-full items-center gap-2.5 rounded-[14px] px-3 text-[13px] font-medium text-[var(--text-3)] transition-colors duration-150 hover:bg-[var(--hover-bg)] hover:text-[var(--text-2)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 active:scale-[0.98]"
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              Sign out
            </button>
          </>
        )}
      </div>

      {/* ── Collapsed-rail tooltip (decorative; links already named) ── */}
      {tip && (
        <div
          aria-hidden="true"
          className="app-tip fixed z-[60] rounded-[10px] bg-[var(--text-1)] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-[var(--shadow-2)]"
          style={{ left: tip.x, top: tip.y, transform: "translateY(-50%)" }}
        >
          {tip.label}
        </div>
      )}
    </aside>
  );
}
