"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { createClient } from "@/lib/supabase/client";
import { hideLoading } from "@/lib/loading-manager";
import { PageTransition } from "@/components/ui/page-transition";
import { Avatar } from "@/components/ui/avatar";
import { Brand } from "@/components/ui/brand";
import { SafeLiveClock } from "@/components/ui/safe-live-clock";
import { getBreadcrumbSegments } from "@/components/dashboard/helpers";
import { AppSidebar, ADMIN_NAV_GROUPS, adminRoleLabel } from "./app-sidebar";
import {
  ChevronRight,
  Clock,
  X,
} from "lucide-react";

/* ══════════════════════════════════════════════════════════════
   DesktopSidebar lives in ./app-sidebar (floating AppSidebar).
   ══════════════════════════════════════════════════════════════ */

/* ══════════════════════════════════════════════════════════════
   MobileDrawer — portal'd to <body>, zero dashboard interaction

   Renders via createPortal directly into document.body.
   Completely outside the dashboard DOM tree.
   The dashboard never knows this exists.
   ══════════════════════════════════════════════════════════════ */

function MobileDrawer({
  open,
  onToggle,
  onClose,
  adminName,
}: {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  adminName: string;
}) {
  const [mounted, setMounted] = useState(false);
  const fabRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Escape closes; focus moves into the drawer on open and back to the
  // hamburger on close. The prevOpenRef guard prevents stealing focus
  // on first mount.
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (!mounted) return;
    if (open) {
      prevOpenRef.current = true;
      function handleKey(e: KeyboardEvent) {
        if (e.key === "Escape") onClose();
      }
      document.addEventListener("keydown", handleKey);
      const panel = document.getElementById("admin-mobile-menu");
      const first = panel?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      first?.focus();
      return () => document.removeEventListener("keydown", handleKey);
    }
    if (prevOpenRef.current) {
      prevOpenRef.current = false;
      fabRef.current?.focus();
    }
    return undefined;
  }, [open, mounted, onClose]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* ── FAB: opens the menu; hidden while open (in-drawer X takes over) ── */}
      {!open && (
        <button
          ref={fabRef}
          onClick={onToggle}
          className="mobile-fab md:hidden"
          aria-label="Open menu"
          aria-expanded={false}
        >
          <div className="mobile-fab-icon">
            <span />
            <span />
            <span />
          </div>
        </button>
      )}

      {/* ── Backdrop: fixed, blurred, fades in ── */}
      <div
        className={`mobile-sidebar-overlay md:hidden ${open ? "is-open" : ""}`}
        onClick={onClose}
      />

      {/* ── Drawer: fixed, slides from left, above everything ── */}
      <MobileDrawerPanel open={open} onClose={onClose} adminName={adminName} />
    </>,
    document.body,
  );
}

/* ══════════════════════════════════════════════════════════════
   MobileDrawerPanel — the actual sliding sidebar content
   ══════════════════════════════════════════════════════════════ */

function MobileDrawerPanel({
  open,
  onClose,
  adminName,
}: {
  open: boolean;
  onClose: () => void;
  adminName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    onClose();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleNavClick = () => onClose();

  const isActiveByHref = (href: string) =>
    pathname === href ||
    (href !== "/admin" && pathname.startsWith(href));

  return (
    <div
      id="admin-mobile-menu"
      role="dialog"
      aria-label="Menu"
      className={`mobile-sidebar md:hidden rounded-r-[24px] ${open ? "is-open" : ""}`}
    >
      <div className="flex h-full flex-col overflow-hidden rounded-r-[24px]">
        {/* ── Brand + close ── */}
        <div className="flex items-center shrink-0 h-[56px] px-4">
          <Link href="/admin" className="flex items-center shrink-0" onClick={handleNavClick}>
            <Brand color="dark" size="sm" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="ml-auto flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[12px] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-[-2px]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <AppSidebar
          groups={ADMIN_NAV_GROUPS}
          pathname={pathname}
          isActive={isActiveByHref}
          collapsed={false}
          onToggleCollapsed={onClose}
          user={{ name: adminName, roleLabel: adminRoleLabel(adminName) }}
          onSignOut={handleSignOut}
          variant="drawer"
          onNavigate={handleNavClick}
        />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   AdminShell — the main export
   ══════════════════════════════════════════════════════════════ */

export function AdminShell({
  children,
  adminName,
}: {
  children: React.ReactNode;
  adminName: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleMobile = useCallback(() => setMobileOpen(prev => !prev), []);
  const crumbs = getBreadcrumbSegments(pathname);
  const roleLabel = adminRoleLabel(adminName);
  // Leads carries the densest table in the app — allow it a wider container.
  // Allocation's 7-column report needs the same room.
  // Every other route keeps the default readable measure.
  const isWideRoute =
    pathname.startsWith("/admin/leads") || pathname.startsWith("/admin/allocation");

  // Active-route matching — unchanged logic, now shared with AppSidebar.
  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/admin" && pathname.startsWith(href));

  const handleSignOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }, [router]);

  // Hide the loading overlay when the admin shell mounts
  useEffect(() => {
    hideLoading();
  }, []);

  // Scroll to top on route change
  useEffect(() => {
    const main = document.querySelector("main");
    if (main) main.scrollTop = 0;
  }, [pathname]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile sidebar is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <div
      className="flex h-screen overflow-hidden bg-[var(--canvas)]"
      style={{ "--sb-w": collapsed ? "72px" : "252px" } as CSSProperties}
    >
      {/* ── Floating desktop sidebar ── */}
      <AppSidebar
        groups={ADMIN_NAV_GROUPS}
        pathname={pathname}
        isActive={isActive}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed(!collapsed)}
        user={{ name: adminName, roleLabel }}
        onSignOut={handleSignOut}
        variant="desktop"
      />

      {/* ── Main Content ── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden md:ml-[calc(var(--sb-w)+24px)] md:transition-[margin-left] md:duration-[220ms] md:ease-[cubic-bezier(0.2,0.8,0.2,1)]">
        <header className="app-topbar relative z-[29] mx-3 mt-3 hidden h-14 shrink-0 items-center justify-between rounded-[18px] border border-[var(--border)] px-4 shadow-[var(--shadow-soft)] md:flex">
          <div className="flex items-center gap-3">
            <nav aria-label="Breadcrumb">
              <ol className="flex items-center gap-1.5 text-[14px]">
                <li className="text-[var(--text-2)]">{crumbs.section}</li>
                <li aria-hidden="true" className="text-[var(--text-3)]">
                  <ChevronRight className="h-3.5 w-3.5" />
                </li>
                <li aria-current="page" className="text-[14px] font-semibold text-[var(--text-1)]">{crumbs.page}</li>
              </ol>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full bg-[var(--hover-bg)] px-3 py-1.5 tabular-nums lg:flex">
              <Clock className="h-[14px] w-[14px] shrink-0 text-[var(--text-3)]" />
              <SafeLiveClock showLabel />
            </div>
            <div className="w-px h-4 bg-[var(--border)]" />
            <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[var(--hover-bg)]">
              <Avatar name={adminName} size="sm" />
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className={`${isWideRoute ? "max-w-[1400px]" : "max-w-[1200px]"} mx-auto px-4 py-6 md:px-10 md:py-8 mobile-content-pad`}>
            <PageTransition>{children}</PageTransition>
          </div>
        </main>
      </div>

      {/* ── Mobile Drawer — portal'd to <body>, invisible to this layout ── */}
      <MobileDrawer open={mobileOpen} onToggle={toggleMobile} onClose={closeMobile} adminName={adminName} />
    </div>
  );
}
