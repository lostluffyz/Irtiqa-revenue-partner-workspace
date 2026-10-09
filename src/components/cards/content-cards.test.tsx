import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AnnouncementCard,
  ResourceCard,
  EmptyContentCard,
  formatPostedDate,
} from "./content-cards";

describe("formatPostedDate", () => {
  it("formats date-only and ISO timestamps without timezone shifting", () => {
    expect(formatPostedDate("2026-10-03")).toBe("Oct 3, 2026");
    expect(formatPostedDate("2026-10-03T18:16:00.000Z")).toBe("Oct 3, 2026");
    expect(formatPostedDate("2025-01-05")).toBe("Jan 5, 2025");
  });

  it("returns invalid input unchanged", () => {
    expect(formatPostedDate("not-a-date")).toBe("not-a-date");
    expect(formatPostedDate("")).toBe("");
  });
});

describe("AnnouncementCard", () => {
  const base = {
    title: "New leads uploaded",
    content: "Fresh batch is live.",
    postedLabel: "Posted Oct 3, 2026",
    postedTitle: "2026-10-03T10:00:00Z",
  };

  it("shows the Pinned pill only when pinned", () => {
    const pinned = renderToStaticMarkup(<AnnouncementCard {...base} pinned={true} />);
    expect(pinned).toContain("Pinned");
    const plain = renderToStaticMarkup(<AnnouncementCard {...base} pinned={false} />);
    expect(plain).not.toContain("Pinned");
  });

  it("renders title and posted date", () => {
    const html = renderToStaticMarkup(<AnnouncementCard {...base} pinned={false} />);
    expect(html).toContain("New leads uploaded");
    expect(html).toContain("Posted Oct 3, 2026");
    expect(html).toContain('title="2026-10-03T10:00:00Z"');
  });
});

describe("ResourceCard", () => {
  it("renders the correct icon marker per type", () => {
    for (const type of ["document", "link", "video", "faq"] as const) {
      const html = renderToStaticMarkup(
        <ResourceCard title="T" description="D" type={type} url={null} />,
      );
      expect(html).toContain(`data-type="${type}"`);
    }
  });

  it("shows the Open button only with a URL, with noopener noreferrer", () => {
    const withUrl = renderToStaticMarkup(
      <ResourceCard title="T" description="D" type="link" url="https://example.com/x" />,
    );
    expect(withUrl).toContain("https://example.com/x");
    expect(withUrl).toContain('rel="noopener noreferrer"');
    expect(withUrl).toContain("Open");
    const withoutUrl = renderToStaticMarkup(
      <ResourceCard title="T" description="D" type="faq" url={null} />,
    );
    expect(withoutUrl).not.toContain("Open");
  });

  it("shows title and type pill", () => {
    const html = renderToStaticMarkup(
      <ResourceCard title="Playbook" description={null} type="video" url={null} />,
    );
    expect(html).toContain("Playbook");
    expect(html).toContain("Video");
  });
});

describe("EmptyContentCard", () => {
  it("renders title and body", () => {
    const html = renderToStaticMarkup(
      <EmptyContentCard icon={<span />} title="Empty" body="Nothing here yet." />,
    );
    expect(html).toContain("Empty");
    expect(html).toContain("Nothing here yet.");
  });
});
