import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen } from "lucide-react";
import Link from "next/link";
import { ResourceActions } from "./resource-actions";
import {
  ResourceCard,
  EmptyContentCard,
  type ResourceType,
} from "@/components/cards/content-cards";
import type { Resource } from "@/types/database";

const TYPE_LABELS: Record<string, string> = {
  document: "Documents",
  video: "Videos",
  link: "Links",
  faq: "FAQs",
};

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
      <div className="flex items-start justify-between gap-3 mb-8 max-sm:flex-col max-sm:items-stretch">
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] font-bold tracking-[-0.025em] text-[var(--text-1)]">
            Resources
          </h1>
          <p className="mt-1 text-[14px] text-[var(--text-3)]">
            Tools, documents, and links for partners.
          </p>
        </div>
        {resources.length > 0 && (
          <Link href="/admin/resources/new" className="shrink-0 max-sm:mt-1">
            <Button size="sm" className="whitespace-nowrap max-sm:min-h-[48px] max-sm:w-full">
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add resource</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </Link>
        )}
      </div>

      {resources.length === 0 ? (
        <EmptyContentCard
          icon={<BookOpen className="h-7 w-7" />}
          title="No resources yet"
          body="Add guides, scripts, videos and FAQs for your partners."
          action={
            <Link href="/admin/resources/new">
              <Button size="sm" className="min-h-[44px]">
                <Plus className="h-3.5 w-3.5" />
                Add resource
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-8">
          {TYPE_ORDER.filter((type) => grouped.has(type)).map((type) => {
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
                      key={resource.id as string}
                      title={resource.title as string}
                      description={resource.description as string}
                      type={(resource.type || "document") as ResourceType}
                      url={resource.url as string}
                      activePill={resource.is_active ? "active" : "hidden"}
                      sortOrder={resource.sort_order as number}
                      actions={
                        <ResourceActions
                          id={resource.id as string}
                          title={resource.title as string}
                          description={(resource.description as string) || ""}
                          type={resource.type as string}
                          url={(resource.url as string) || ""}
                          sortOrder={resource.sort_order as number}
                          isActive={resource.is_active as boolean}
                        />
                      }
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
