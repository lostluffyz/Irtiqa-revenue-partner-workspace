import { requirePartner } from "@/lib/partner";
import { BookOpen } from "lucide-react";
import { redirect } from "next/navigation";
import type { Resource } from "@/types/database";
import {
  ResourceCard,
  EmptyContentCard,
  type ResourceType,
} from "@/components/cards/content-cards";

const TYPE_LABELS: Record<string, string> = {
  document: "Documents",
  video: "Videos",
  link: "Links",
  faq: "FAQs",
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
        <EmptyContentCard
          icon={<BookOpen className="h-7 w-7" />}
          title="No resources yet"
          body="Guides, scripts and links shared by your admin will show up here."
        />
      ) : (
        <div className="space-y-8">
          {(() => {
            const grouped = groupByType(resources);
            return TYPE_ORDER.filter((type) => grouped.has(type)).map((type) => {
              const items = grouped.get(type) || [];
              return (
                <div key={type}>
                  {/* Type header */}
                  <div className="flex items-center gap-2.5 mb-3">
                    <h2 className="text-[12px] font-semibold uppercase tracking-[0.05em] text-[var(--text-3)]">
                      {TYPE_LABELS[type] || type}
                    </h2>
                    <span className="text-[11px] text-[var(--text-3)] tabular-nums">
                      {items.length}
                    </span>
                    <div className="flex-1 h-px bg-[var(--border)]" />
                  </div>

                  {/* Resource cards */}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {items.map((resource) => (
                      <ResourceCard
                        key={resource.id}
                        title={resource.title}
                        description={resource.description}
                        type={(resource.type || "document") as ResourceType}
                        url={resource.url}
                      />
                    ))}
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
