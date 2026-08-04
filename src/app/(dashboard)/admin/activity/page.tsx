import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { EmptyState } from "@/components/ui/empty-state";
import { Activity } from "lucide-react";

function formatAction(action: string): string {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l: string) => l.toUpperCase());
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
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
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDotColor(action: string): string {
  if (action.includes("partner")) return "bg-[var(--accent)]";
  if (action.includes("lead")) return "bg-purple-500";
  if (action.includes("report")) return "bg-[var(--status-success)]";
  return "bg-[var(--text-3)]";
}

function getActionCategory(action: string): string {
  if (action.includes("partner")) return "Partner";
  if (action.includes("lead")) return "Lead";
  if (action.includes("report")) return "Report";
  return "System";
}

interface ActivityEntry {
  id: string;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

async function getActivity() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partner_activity_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Failed to fetch activity:", error.message);
    return [];
  }

  return (data || []) as ActivityEntry[];
}

function groupByDate(entries: ActivityEntry[]): Map<string, ActivityEntry[]> {
  const groups = new Map<string, ActivityEntry[]>();
  for (const entry of entries) {
    const dateKey = new Date(entry.created_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const existing = groups.get(dateKey) || [];
    existing.push(entry);
    groups.set(dateKey, existing);
  }
  return groups;
}

export default async function ActivityPage() {
  await requireAdmin();
  const activity = await getActivity();
  const grouped = groupByDate(activity);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-[-0.025em] text-[var(--text-1)]">
          Activity
        </h1>
        <p className="mt-1 text-[14px] text-[var(--text-3)]">
          System events and partner actions.
        </p>
      </div>

      {activity.length === 0 ? (
        <EmptyState
          icon={<Activity className="h-6 w-6" />}
          title="No activity recorded"
          description="Activity entries will appear here as partners and admins use the workspace."
        />
      ) : (
        <div className="space-y-8">
          {Array.from(grouped.entries()).map(([date, entries]) => (
            <div key={date}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--text-3)] whitespace-nowrap">
                  {date}
                </h2>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>

              {/* Timeline */}
              <div className="relative pl-7">
                {/* Vertical line */}
                <div className="absolute left-[7px] top-3 bottom-3 w-px bg-[var(--border)]" />

                {/* Entries */}
                <div className="space-y-0">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="relative flex items-start gap-4 py-3"
                    >
                      {/* Dot */}
                      <div className={`absolute -left-7 top-[13px] h-[7px] w-[7px] rounded-full border-[2.5px] border-[var(--canvas)] ${getDotColor(entry.action)}`} />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <p className="text-[13px] font-medium text-[var(--text-1)] leading-snug">
                            {formatAction(entry.action)}
                          </p>
                          <span className="text-[10px] font-semibold uppercase tracking-[0.05em] text-[var(--text-3)]">
                            {getActionCategory(entry.action)}
                          </span>
                        </div>

                        {entry.details && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {typeof entry.details === "object" &&
                              !Array.isArray(entry.details) &&
                              Object.entries(entry.details)
                                .filter(([key]) => !key.toLowerCase().includes("passw") && !key.toLowerCase().includes("secret"))
                                .map(([key, value]) => (
                                  <span
                                    key={key}
                                    className="inline-block rounded-full bg-[#F3F4F6] px-2 py-0.5 text-[11px] text-[var(--text-2)]"
                                  >
                                    <span className="text-[var(--text-3)]">{key}:</span> {String(value).substring(0, 50)}
                                  </span>
                                ))}
                          </div>
                        )}
                      </div>

                      <span className="shrink-0 text-[11px] text-[var(--text-3)] tabular-nums">
                        {formatTimestamp(entry.created_at)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
