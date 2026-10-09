import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AppTopbar } from "./app-topbar";

/**
 * AppTopbar regression guard (node-only, no DOM required).
 *
 * Covers the shared floating top bar contract: breadcrumb segments,
 * current-page emphasis, separators, avatar initials, and clock wrapper.
 */

describe("AppTopbar", () => {
  it("shows section and current page, page with stronger style", () => {
    const html = renderToStaticMarkup(
      <AppTopbar segments={{ section: "Partner", page: "My Leads" }} avatarName="Jane Doe" />,
    );
    expect(html).toContain("Partner");
    expect(html).toContain("My Leads");
    expect(html).toContain('aria-current="page"');
    // Current page carries the stronger style (semibold + text-1).
    expect(html).toContain("font-semibold");
    expect(html).toContain("text-[var(--text-1)]");
  });

  it("renders a separator between segments", () => {
    const html = renderToStaticMarkup(
      <AppTopbar segments={{ section: "Admin", page: "Partners" }} avatarName="Admin" />,
    );
    expect(html).toContain('aria-hidden="true"');
    // Chevron separator icon.
    expect(html).toContain("<svg");
  });

  it("renders avatar initials from the name", () => {
    const html = renderToStaticMarkup(
      <AppTopbar segments={{ section: "Partner", page: "Dashboard" }} avatarName="Jane Doe" />,
    );
    // Avatar component renders "JD" for "Jane Doe".
    expect(html).toContain("JD");
  });

  it("keeps the live-clock wrapper (pill, hidden below lg)", () => {
    const html = renderToStaticMarkup(
      <AppTopbar segments={{ section: "Partner", page: "Dashboard" }} avatarName="Jane Doe" />,
    );
    expect(html).toContain("hidden");
    expect(html).toContain("lg:flex");
    expect(html).toContain("rounded-full");
  });

  it("is sticky with z-29 and hidden below md", () => {
    const html = renderToStaticMarkup(
      <AppTopbar segments={{ section: "Partner", page: "Dashboard" }} avatarName="Jane Doe" />,
    );
    expect(html).toContain("sticky");
    expect(html).toContain("top-3");
    expect(html).toContain("z-[29]");
    expect(html).toContain("hidden");
    expect(html).toContain("md:flex");
  });
});
