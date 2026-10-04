import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Navigation loading regression guard (node-only, no DOM required).
 *
 * Background: soft navigation between dashboard routes showed a blank
 * content area because (a) no loading.tsx Suspense fallback existed, and
 * (b) PageTransition used AnimatePresence mode="wait", which unmounts the
 * old page before the new page's RSC stream resolves.
 *
 * These invariants keep that from regressing.
 */

const REPO_ROOT = path.resolve(__dirname, "../../..");

function readSource(relativePath: string): string {
  return fs.readFileSync(path.join(REPO_ROOT, relativePath), "utf8");
}

describe("dashboard navigation loading", () => {
  it("admin segment has a loading fallback", () => {
    const file = "src/app/(dashboard)/admin/loading.tsx";
    expect(fs.existsSync(path.join(REPO_ROOT, file))).toBe(true);
    const source = readSource(file);
    expect(source).toContain("aria-busy");
    expect(source).toContain("Skeleton");
  });

  it("partner segment has a loading fallback", () => {
    const file = "src/app/(dashboard)/partner/loading.tsx";
    expect(fs.existsSync(path.join(REPO_ROOT, file))).toBe(true);
    const source = readSource(file);
    expect(source).toContain("aria-busy");
    expect(source).toContain("Skeleton");
  });

  it("PageTransition never uses AnimatePresence mode=\"wait\"", () => {
    const source = readSource("src/components/ui/page-transition.tsx");
    // Match JSX prop usage only (prose comments may mention the mode name).
    expect(source).not.toMatch(/<AnimatePresence[^>]*\bmode=/);
    // The transition wrapper itself (cross-fade) must be preserved.
    expect(source).toContain("AnimatePresence");
    expect(source).toContain("initial");
    expect(source).toContain("animate");
  });
});
