import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen, Plus, FileText, Video, Link as LinkIcon, HelpCircle, ExternalLink } from "lucide-react";
import Link from "next/link";
import { ResourceActions } from "./resource-actions";
import type { Resource } from "@/types/database";

async function getResources(): Promise<Resource[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch resources:", error.message);
    return [];
  }

  return (data || []) as Resource[];
}

const TYPE_META: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  document: { icon: FileText, label: "Document" },
  video: { icon: Video, label: "Video" },
  link: { icon: LinkIcon, label: "Link" },
  faq: { icon: HelpCircle, label: "FAQ" },
};

const TYPE_ORDER = ["document", "video", "link", "faq"];

function groupByType(resources: Resource[]) {
  const groups = new Map<string, Resource[]>();
  for (const resource of resources) {
    const type = resource.type || "document";
    const existing = groups.get(type) || [];
    existing.push(resource);
    groups.set(type, existing);
  }
  return groups;
}

export default async function ResourcesPage() {
  await requireAdmin();
  const resources = await getResources();
  const grouped = groupByType(resources);

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-[28px] font-bold tracking-[-0.025em] text-[var(--text-1)]">
            Resources
          </h1>
          <p className="mt-1 text-[14px] text-[var(--text-3)]">
            Tools, documents, and links for partners.
          </p>
        </div>
        <Link href="/admin/resources/new">
          <Button size="sm">
            <Plus className="h-3.5 w-3.5" />
            Add Resource
          </Button>
        </Link>
      </div>

      {resources.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="No resources"
          description="Add guides, scripts, videos, and FAQs for Revenue Partners"
          action={
            <Link href="/admin/resources/new">
              <Button size="sm">
                <Plus className="h-3.5 w-3.5" />
                Add Resource
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          {TYPE_ORDER.filter((type) => grouped.has(type)).map((type) => {
            const items = grouped.get(type) || [];
            const meta = TYPE_META[type] || TYPE_META.document;
            const Icon = meta.icon;

            return (
              <div key={type}>
                {/* Type header */}
                <div className="flex items-center gap-2.5 mb-3">
                  <Icon className="h-4 w-4 text-[var(--text-3)]" />
                  <h2 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--text-3)]">
                    {meta.label}s
                  </h2>
                  <span className="text-[11px] text-[var(--text-3)] tabular-nums">
                    {items.length}
                  </span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>

                {/* Resource list */}
                <div className="surface">
                  <div className="divide-y divide-[var(--border-subtle)]">
                    {items.map((resource) => (
                      <div
                        key={resource.id as string}
                        className="flex items-start justify-between gap-4 px-5 py-3.5 transition-colors duration-120 hover:bg-[var(--hover-bg)]"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-[13px] font-medium text-[var(--text-1)] leading-snug">
                              {resource.title}
                            </p>
                            {!resource.is_active && (
                              <Badge variant="warning">Inactive</Badge>
                            )}
                          </div>
                          {resource.description && (
                            <p className="mt-0.5 text-[12px] text-[var(--text-3)] line-clamp-1">
                              {resource.description}
                            </p>
                          )}
                          {resource.url && (
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors duration-150"
                            >
                              Open link
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                        <ResourceActions
                          id={resource.id as string}
                          title={resource.title as string}
                          description={(resource.description as string) || ""}
                          type={resource.type as string}
                          url={(resource.url as string) || ""}
                          sortOrder={resource.sort_order as number}
                          isActive={resource.is_active as boolean}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
