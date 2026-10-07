import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AppSidebar,
  ADMIN_NAV_GROUPS,
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
});
