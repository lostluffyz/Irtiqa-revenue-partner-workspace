"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/ui/form-error";
import { PageHeader } from "@/components/ui/page-header";
import { ArrowLeft, FileText, Link2, PlayCircle, HelpCircle } from "lucide-react";
import Link from "next/link";
import { createResourceAction } from "../actions";

const RESOURCE_TYPES = [
  { value: "document", label: "Document", icon: FileText },
  { value: "link", label: "Link", icon: Link2 },
  { value: "video", label: "Video", icon: PlayCircle },
  { value: "faq", label: "FAQ", icon: HelpCircle },
] as const;

export default function NewResourcePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("document");
  const [url, setUrl] = useState("");
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("title", title);
    formData.set("description", description);
    formData.set("type", type);
    formData.set("url", url);
    formData.set("sortOrder", String(sortOrder));
    formData.set("isActive", String(isActive));

    const result = await createResourceAction(null, formData);
    if (result.success) {
      router.push("/admin/resources");
      router.refresh();
    } else {
      setError(result.error || "Failed to create resource");
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-[720px]">
      <Link
        href="/admin/resources"
        className="inline-flex items-center gap-1 text-[13px] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors duration-150 mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Resources
      </Link>

      <PageHeader
        title="Add Resource"
        description="Share a guide, link, video or FAQ with your partners."
      />

      <form
        onSubmit={handleSubmit}
        className="mt-6 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-soft)] max-md:p-4 space-y-5"
      >
        {error && (
          <div role="alert">
            <FormError message={error} />
          </div>
        )}

        <div>
          <Input
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="e.g., Revenue Partner Guide"
            maxLength={300}
          />
          <p className="mt-1 text-right text-[11px] tabular-nums text-[var(--text-3)]">
            {title.length} / 300
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium text-[var(--text-2)]">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Brief description of this resource"
            className="input-field min-h-[160px] text-[13px]"
          />
        </div>

        <div className="space-y-1.5">
          <span id="new-resource-type-label" className="block text-[13px] font-medium text-[var(--text-2)]">
            Type
          </span>
          <div
            role="radiogroup"
            aria-labelledby="new-resource-type-label"
            className="flex flex-wrap gap-2"
          >
            {RESOURCE_TYPES.map((t) => {
              const active = type === t.value;
              const Icon = t.icon;
              return (
                <label
                  key={t.value}
                  className={`inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-full border px-4 text-[13px] font-medium transition-colors duration-150 focus-within:outline-2 focus-within:outline-[var(--accent)] focus-within:outline-offset-2 ${
                    active
                      ? "border-transparent bg-[var(--text-1)] text-white"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)]"
                  }`}
                >
                  <input
                    type="radio"
                    name="type"
                    value={t.value}
                    checked={active}
                    onChange={() => setType(t.value)}
                    className="sr-only"
                  />
                  <Icon className="h-3.5 w-3.5" />
                  {t.label}
                </label>
              );
            })}
          </div>
        </div>

        <Input
          label="URL (optional)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
        />

        <Input
          label="Sort Order"
          type="number"
          value={String(sortOrder)}
          onChange={(e) => setSortOrder(parseInt(e.target.value) || 0)}
        />

        <div className="space-y-1.5">
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            aria-label="Resource visible to partners"
            onClick={() => setIsActive((v) => !v)}
            className="flex min-h-[44px] items-center gap-3"
          >
            <span
              aria-hidden="true"
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 ${
                isActive ? "bg-[var(--accent)]" : "bg-[var(--border)]"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-150 ${
                  isActive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </span>
            <span className="text-left">
              <span className="block text-[13px] font-medium text-[var(--text-1)]">
                Visible to partners
              </span>
              <span className="block text-[12px] text-[var(--text-3)]">
                Hidden resources are not shown to partners.
              </span>
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" loading={loading} className="flex-1 min-h-[44px]">
            Add resource
          </Button>
          <Link href="/admin/resources">
            <Button type="button" variant="secondary" className="min-h-[44px]">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
