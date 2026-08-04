import { requirePartner } from "@/lib/partner";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpen, ExternalLink, FileText, Video, HelpCircle, Link as LinkIcon } from "lucide-react";
import { redirect } from "next/navigation";
import type { Resource } from "@/types/database";

const TYPE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  document: { label: "Document", icon: FileText },
  link: { label: "Link", icon: LinkIcon },
  video: { label: "Video", icon: Video },
  faq: { label: "FAQ", icon: HelpCircle },
};

const TYPE_ORDER = ["document", "video", "link", "faq"];

async function getActiveResources(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
) {
  const { data, error } = await supabase
    .from("resources")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });

  if (error) {
    console.error("Failed to fetch resources:", error.message);
    return [];
  }

  return (data || []) as Resource[];
}

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

export default async function PartnerResourcesPage() {
  const { supabase } = await requirePartner().catch(() => {
    throw redirect("/login");
  });

  const resources = await getActiveResources(supabase);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[28px] font-bold tracking-[-0.025em] text-[var(--text-1)]">
          Resources
        </h1>
        <p className="mt-1 text-[14px] text-[var(--text-2)]">
          Tools and documents to help you succeed.
        </p>
        <div className="mt-3 h-px bg-[var(--border-subtle)]" />
      </div>

      {resources.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="h-8 w-8" />}
          title="No resources available"
          description="Resources will appear here once they are published by your admin."
        />
      ) : (
        <div className="space-y-8">
          {(() => {
            const grouped = groupByType(resources);
            return TYPE_ORDER.filter((type) => grouped.has(type)).map((type) => {
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
                    <div className="flex-1 h-px bg-[var(--border-subtle)]" />
                  </div>

                  {/* Resource list */}
                  <div className="surface">
                    <div className="divide-y divide-[var(--border-subtle)]">
                      {items.map((resource) => (
                        <div
                          key={resource.id}
                          className="px-5 py-3.5 transition-all duration-150 hover:bg-[var(--hover-bg)] hover:-translate-y-px hover:shadow-sm active:scale-[0.99]"
                        >
                          <p className="text-[14px] font-semibold text-[var(--text-1)] leading-snug">
                            {resource.title}
                          </p>
                          {resource.description && (
                            <p className="mt-0.5 text-[12px] text-[var(--text-2)] leading-relaxed line-clamp-1">
                              {resource.description}
                            </p>
                          )}
                          {resource.url && (
                            <a
                              href={resource.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors duration-150"
                            >
                              Open Link
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            });
          })()}
        </div>
      )}
    </div>
  );
}
