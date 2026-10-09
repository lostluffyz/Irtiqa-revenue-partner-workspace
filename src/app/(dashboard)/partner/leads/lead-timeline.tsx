"use client";

import type { StatusHistoryEntry } from "../actions";

const STATUS_LABELS: Record<string, string> = {
  not_contacted: "Not Contacted",
  contacted: "Contacted",
  follow_up_required: "Follow Up",
  appointment_booked: "Appointment Booked",
  closed: "Closed",
  not_interested: "Not Interested",
  invalid_contact: "Invalid",
};

function formatTimelineDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTimelineDotColor(action: string): string {
  if (action === "assigned") return "bg-[var(--accent)]";
  return "bg-[var(--text-3)]";
}

interface TimelineEvent {
  id: string;
  action: string;
  title: string;
  description?: string;
  timestamp: string;
}

interface LeadTimelineProps {
  assignedAt: string | null;
  statusHistory: StatusHistoryEntry[];
}

export function LeadTimeline({ assignedAt, statusHistory }: LeadTimelineProps) {
  // Build events from assignment + status history
  const events: TimelineEvent[] = [];

  if (assignedAt) {
    events.push({
      id: "assigned",
      action: "assigned",
      title: "Lead Assigned",
      description: "Lead was assigned to you",
      timestamp: assignedAt,
    });
  }

  for (const entry of statusHistory) {
    events.push({
      id: entry.id,
      action: "status_change",
      title: "Status Updated",
      description: `${STATUS_LABELS[entry.old_status] || entry.old_status} → ${STATUS_LABELS[entry.new_status] || entry.new_status}`,
      timestamp: entry.changed_at,
    });
  }

  // Sort by timestamp descending (most recent first)
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (events.length === 0) {
    return (
      <p className="text-[12px] text-[var(--text-3)] py-2 italic opacity-60">
        No activity recorded yet.
      </p>
    );
  }

  return (
    <div className="relative pl-6">
      {/* Vertical line */}
      <div className="absolute left-[9px] top-2 bottom-2 w-px bg-[var(--border)]" />

      <div className="space-y-0">
        {events.map((event) => (
          <div
            key={event.id}
            className="relative flex items-start gap-2.5 py-2"
          >
            {/* Dot */}
            <div
              className={`absolute -left-6 top-[13px] h-2 w-2 rounded-full shrink-0 ${getTimelineDotColor(event.action)}`}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold text-[var(--text-1)] leading-snug">
                  {event.title}
                </p>
                <span
                  className="shrink-0 text-[10px] text-[var(--text-3)] tabular-nums"
                  title={formatFullDate(event.timestamp)}
                >
                  {formatTimelineDate(event.timestamp)}
                </span>
              </div>
              {event.description && (
                <p className="mt-px text-[11px] text-[var(--text-2)] leading-relaxed">
                  {event.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
