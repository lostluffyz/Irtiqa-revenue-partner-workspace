"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/ui/form-error";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { updateResourceAction } from "../../actions";

interface ResourceData {
  id: string;
  title: string;
  description: string | null;
  type: string;
  url: string | null;
  sort_order: number;
  is_active: boolean;
}

export function EditResourceForm({ resource }: { resource: ResourceData }) {
  const router = useRouter();
  const [title, setTitle] = useState(resource.title);
  const [description, setDescription] = useState(resource.description || "");
  const [type, setType] = useState(resource.type);
  const [url, setUrl] = useState(resource.url || "");
  const [sortOrder, setSortOrder] = useState(resource.sort_order);
  const [isActive, setIsActive] = useState(resource.is_active);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("id", resource.id);
    formData.set("title", title);
    formData.set("description", description);
    formData.set("type", type);
    formData.set("url", url);
    formData.set("sortOrder", String(sortOrder));
    formData.set("isActive", String(isActive));

    const result = await updateResourceAction(null, formData);
    if (result.success) {
      router.push("/admin/resources");
      router.refresh();
    } else {
      setError(result.error || "Failed to update resource");
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/admin/resources"
        className="inline-flex items-center gap-1 text-[13px] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors duration-150 mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Resources
      </Link>

      <h1 className="text-[28px] font-bold tracking-[-0.02em] text-[var(--text-1)] mb-6">
        Edit Resource
      </h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <FormError message={error} />}

        <Input
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={300}
        />

        <div className="space-y-1.5">
          <label className="block text-[12px] font-semibold text-[var(--text-2)]">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="input-field min-h-[80px] text-[13px]"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-[12px] font-semibold text-[var(--text-2)]">
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="input-field text-[13px]"
          >
            <option value="document">Document</option>
            <option value="link">Link</option>
            <option value="video">Video</option>
            <option value="faq">FAQ</option>
          </select>
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

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--focus-ring)]"
          />
          <span className="text-[13px] text-[var(--text-2)]">
            Active (visible to partners)
          </span>
        </label>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" loading={loading} className="flex-1">
            Save Changes
          </Button>
          <Link href="/admin/resources">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
