import type { ReactNode } from "react";
import {
  Pin,
  FileText,
  Link2,
  PlayCircle,
  HelpCircle,
  ArrowUpRight,
} from "lucide-react";
import { formatWebsiteHostname } from "@/components/dashboard/helpers";

// ============================================
// Date helpers (timezone-safe: manual part parsing, never Date)
// ============================================

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

function parseDateParts(dateStr: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim());
  if (!match) return null;
  const y = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const d = parseInt(match[3], 10);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  return { y, m, d };
}

/** "Oct 3, 2026" from "2026-10-03" or "2026-10-03T…". Falls back to input. */
export function formatPostedDate(value: string): string {
  const parts = parseDateParts(value);
  if (!parts) return value;
  return `${SHORT_MONTHS[parts.m - 1]} ${parts.d}, ${parts.y}`;
}

// ============================================
// AnnouncementCard (partner + admin)
// ============================================

interface AnnouncementCardProps {
  title: string;
  content: string;
  pinned: boolean;
  postedLabel: string;
  postedTitle?: string;
  footer?: ReactNode;
}

export function AnnouncementCard({
  title,
  content,
  pinned,
  postedLabel,
  postedTitle,
  footer,
}: AnnouncementCardProps) {
  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] max-md:p-4">
      <div className="flex items-start justify-between gap-3">
        <h3 className="min-w-0 flex-1 text-[16px] font-semibold leading-snug text-[var(--text-1)]">
          {title}
        </h3>
        {pinned && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-[12px] font-medium text-[var(--accent)]">
            <Pin className="h-3 w-3" />
            Pinned
          </span>
        )}
      </div>
      <p className="mt-2 text-[14px] leading-[1.6] text-[var(--text-2)] whitespace-pre-wrap break-words">
        {content}
      </p>
      <p
        className="mt-3 text-[12px] text-[var(--text-3)] tabular-nums"
        title={postedTitle}
      >
        {postedLabel}
      </p>
      {footer}
    </article>
  );
}

// ============================================
// ResourceCard (partner + admin)
// ============================================

export type ResourceType = "document" | "link" | "video" | "faq";

const TYPE_META: Record<ResourceType, { label: string; icon: typeof FileText }> = {
  document: { label: "Document", icon: FileText },
  link: { label: "Link", icon: Link2 },
  video: { label: "Video", icon: PlayCircle },
  faq: { label: "FAQ", icon: HelpCircle },
};

interface ResourceCardProps {
  title: string;
  description: string | null;
  type: ResourceType;
  url: string | null;
  /** null = no pill (partner). "active"/"hidden" renders the admin pill. */
  activePill?: "active" | "hidden" | null;
  /** Shown muted when provided (admin loads sort_order). */
  sortOrder?: number | null;
  /** Admin Edit/Delete row (or any extra footer). */
  actions?: ReactNode;
}

export function ResourceCard({
  title,
  description,
  type,
  url,
  activePill = null,
  sortOrder = null,
  actions,
}: ResourceCardProps) {
  const meta = TYPE_META[type] || TYPE_META.document;
  const Icon = meta.icon;
  const isFaq = type === "faq";

  return (
    <article className="rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-soft)] transition-shadow duration-150 hover:shadow-[var(--shadow-lift)] max-md:p-4">
      <div className="flex items-center gap-3">
        <span
          data-type={type}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--hover-bg)] text-[var(--text-2)]"
        >
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[15px] font-semibold leading-snug text-[var(--text-1)]" title={title}>
            {title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-[var(--border)] px-2 py-px text-[11px] font-medium text-[var(--text-2)]">
              {meta.label}
            </span>
            {activePill === "active" && (
              <span className="rounded-full bg-[var(--status-success-bg)] px-2 py-px text-[11px] font-medium text-[var(--status-success)]">
                Active
              </span>
            )}
            {activePill === "hidden" && (
              <span className="rounded-full bg-[var(--status-warning-bg)] px-2 py-px text-[11px] font-medium text-[var(--status-warning)]">
                Hidden
              </span>
            )}
            {sortOrder !== null && sortOrder !== undefined && (
              <span className="text-[11px] tabular-nums text-[var(--text-3)]">#{sortOrder}</span>
            )}
          </div>
        </div>
      </div>
      {description && (
        <p className={`mt-3 text-[14px] leading-relaxed text-[var(--text-2)] break-words ${isFaq ? "whitespace-pre-wrap" : "line-clamp-3"}`}>
          {description}
        </p>
      )}
      {url && (
        <p className="mt-1.5 truncate text-[12px] tabular-nums text-[var(--text-3)]" title={url}>
          {formatWebsiteHostname(url)}
        </p>
      )}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] border border-[var(--border)] bg-[var(--surface)] px-4 text-[13px] font-medium text-[var(--text-1)] transition-colors duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 md:min-h-0 md:py-2"
          title={url}
        >
          Open
          <ArrowUpRight className="h-3.5 w-3.5" />
        </a>
      )}
      {actions && <div className="mt-3 border-t border-[var(--border-subtle)] pt-3">{actions}</div>}
    </article>
  );
}

// ============================================
// Empty content card (centered, dashed)
// ============================================

export function EmptyContentCard({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[520px] rounded-[18px] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center max-md:px-5 max-md:py-7">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[16px] bg-[var(--hover-bg)] text-[var(--text-2)]">
        {icon}
      </div>
      <h3 className="text-[16px] font-semibold text-[var(--text-1)]">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-[38ch] text-[14px] leading-relaxed text-[var(--text-3)]">
        {body}
      </p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
