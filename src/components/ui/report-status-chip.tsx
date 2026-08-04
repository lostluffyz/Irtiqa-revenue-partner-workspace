import type { ReportStatus } from "@/lib/compliance";

type BadgeVariant = "success" | "warning" | "danger";

const STATUS_CONFIG: Record<
  ReportStatus,
  {
    label: string;
    emoji: string;
    variant: BadgeVariant;
    className: string;
  }
> = {
  submitted: {
    label: "Submitted",
    emoji: "🟢",
    variant: "success",
    className:
      "bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success)]/20",
  },
  pending: {
    label: "Pending",
    emoji: "🟡",
    variant: "warning",
    className:
      "bg-[var(--status-warning-bg)] text-[var(--status-warning)] border border-[var(--status-warning)]/20",
  },
  overdue: {
    label: "Overdue",
    emoji: "🔴",
    variant: "danger",
    className:
      "bg-[var(--status-danger-bg)] text-[var(--status-danger)] border border-[var(--status-danger)]/20",
  },
};

interface ReportStatusChipProps {
  status: ReportStatus;
  showEmoji?: boolean;
  className?: string;
}

export function ReportStatusChip({
  status,
  showEmoji = true,
  className = "",
}: ReportStatusChipProps) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium leading-none tracking-wide ${config.className} ${className}`}
    >
      {showEmoji && <span className="text-[10px]">{config.emoji}</span>}
      {config.label}
    </span>
  );
}
