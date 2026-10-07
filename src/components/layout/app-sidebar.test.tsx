import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AppSidebar,
  ADMIN_NAV_GROUPS,
  PARTNER_NAV_GROUPS,
  ADMIN_NAV_ACTIVE_LAYOUT_ID,
  adminRoleLabel,
  type AppSidebarProps,
} from "./app-sidebar";

/**
 * AppSidebar regression guard (node-only, no DOM required).
 *
 * Covers the floating admin sidebar contract: navigation semantics,
 * collapsed-rail accessibility, drawer variant shape, and the shared
 * active-pill glide primitive.
 */

const TEST_PATHNAME = "/admin/partners";

const baseProps: AppSidebarProps = {
  groups: ADMIN_NAV_GROUPS,
  pathname: TEST_PATHNAME,
  isActive: (href: string) =>
    TEST_PATHNAME === href ||
    (href !== "/admin" && TEST_PATHNAME.startsWith(href)),
  collapsed: false,
  onToggleCollapsed: () => {},
  user: { name: "Administrator", roleLabel: "Admin" },
  brandSubtitle: "Admin console",
  onSignOut: () => {},
  variant: "desktop",
};

const PARTNER_TEST_PATHNAME = "/partner/leads";

const partnerProps: AppSidebarProps = {
  groups: PARTNER_NAV_GROUPS,
  pathname: PARTNER_TEST_PATHNAME,
  isActive: (href: string) =>
    PARTNER_TEST_PATHNAME === href ||
    (href !== "/partner" && PARTNER_TEST_PATHNAME.startsWith(href)),
  collapsed: false,
  onToggleCollapsed: () => {},
  user: { name: "Jane Doe", roleLabel: "Partner" },
  brandSubtitle: "Partner portal",
  onSignOut: () => {},
  variant: "desktop",
};

describe("AppSidebar", () => {
  it("nav has aria-label=\"Primary\"", () => {
    const html = renderToStaticMarkup(<AppSidebar {...baseProps} />);
    expect(html).toContain('aria-label="Primary"');
  });

  it("exactly one link has aria-current=\"page\", and it is the active one", () => {
    const html = renderToStaticMarkup(<AppSidebar {...baseProps} />);
    const currentCount = (html.match(/aria-current="page"/g) || []).length;
    expect(currentCount).toBe(1);
    expect(html).toContain('href="/admin/partners"');
  });

  it("renders every group label and every href from the fixture", () => {
    const html = renderToStaticMarkup(<AppSidebar {...baseProps} />);
    for (const group of ADMIN_NAV_GROUPS) {
      if (group.title) expect(html).toContain(group.title);
      for (const item of group.items) {
        expect(html).toContain(`href="${item.href}"`);
        expect(html).toContain(item.label);
      }
    }
  });

  it("collapsed variant keeps every label in the DOM with link aria-labels", () => {
    const html = renderToStaticMarkup(<AppSidebar {...baseProps} collapsed={true} />);
    for (const group of ADMIN_NAV_GROUPS) {
      for (const item of group.items) {
        expect(html).toContain(item.label);
        expect(html).toContain(`aria-label="${item.label}"`);
      }
    }
  });

  it("drawer variant has no collapse toggle and no fixed sidebar width class", () => {
    const html = renderToStaticMarkup(<AppSidebar {...baseProps} variant="drawer" />);
    expect(html).not.toContain("Collapse sidebar");
    expect(html).not.toContain("Expand sidebar");
    expect(html).not.toContain("w-[var(--sidebar-width)]");
    expect(html).toContain("w-full");
  });

  it("sign-out button exists in both variants", () => {
    const desktop = renderToStaticMarkup(<AppSidebar {...baseProps} />);
    const drawer = renderToStaticMarkup(<AppSidebar {...baseProps} variant="drawer" />);
    expect(desktop).toContain("Sign out");
    expect(drawer).toContain("Sign out");
  });

  it("uses the shared active-pill layout id (no AnimatePresence mode=\"wait\")", () => {
    expect(ADMIN_NAV_ACTIVE_LAYOUT_ID).toBe("admin-nav-active");
  });

  it("adminRoleLabel matches the old shell behavior", () => {
    expect(adminRoleLabel("Administrator")).toBe("Admin");
    expect(adminRoleLabel("Jane Doe")).toBe("Administrator");
  });

  it("admin fixture renders brandSubtitle 'Admin console' and all 9 admin links", () => {
    const html = renderToStaticMarkup(<AppSidebar {...baseProps} />);
    expect(html).toContain("Admin console");
    expect(html).not.toContain("Partner portal");
    const linkCount = (html.match(/<a /g) || []).length;
    expect(linkCount).toBe(9);
    for (const group of ADMIN_NAV_GROUPS) {
      for (const item of group.items) {
        expect(html).toContain(`href="${item.href}"`);
      }
    }
  });

  it("partner fixture renders brandSubtitle 'Partner portal', role pill 'Partner', 6 links", () => {
    const html = renderToStaticMarkup(<AppSidebar {...partnerProps} />);
    expect(html).toContain("Partner portal");
    expect(html).not.toContain("Admin console");
    expect(html).toContain("Partner");
    const linkCount = (html.match(/<a /g) || []).length;
    expect(linkCount).toBe(6);
    for (const label of ["Dashboard", "My Leads", "Daily Report", "Progress", "Announcements", "Resources"]) {
      expect(html).toContain(label);
    }
  });

  it("partner active link has aria-current and drawer has no collapse toggle", () => {
    const html = renderToStaticMarkup(<AppSidebar {...partnerProps} />);
    const currentCount = (html.match(/aria-current="page"/g) || []).length;
    expect(currentCount).toBe(1);
    expect(html).toContain('href="/partner/leads"');
    const drawer = renderToStaticMarkup(<AppSidebar {...partnerProps} variant="drawer" />);
    expect(drawer).not.toContain("Collapse sidebar");
    expect(drawer).not.toContain("Expand sidebar");
    // Drawer omits the brand header (the panel provides its own Brand + X row);
    // it keeps the user tile + Sign out at the bottom.
    expect(drawer).toContain("Jane Doe");
    expect(drawer).toContain("Sign out");
  });

  it("user initial falls back to first letter of name", () => {
    const html = renderToStaticMarkup(<AppSidebar {...partnerProps} />);
    expect(html).toContain(">J<");
  });
});
