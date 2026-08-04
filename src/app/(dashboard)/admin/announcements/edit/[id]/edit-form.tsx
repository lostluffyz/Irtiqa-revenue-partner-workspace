"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/ui/form-error";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { updateAnnouncementAction } from "../../actions";

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
}

export function EditAnnouncementForm({
  announcement,
}: {
  announcement: Announcement;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(announcement.title);
  const [content, setContent] = useState(announcement.content);
  const [isPinned, setIsPinned] = useState(announcement.is_pinned);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("id", announcement.id);
    formData.set("title", title);
    formData.set("content", content);
    formData.set("isPinned", String(isPinned));

    const result = await updateAnnouncementAction(null, formData);
    if (result.success) {
      router.push("/admin/announcements");
      router.refresh();
    } else {
      setError(result.error || "Failed to update announcement");
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/admin/announcements"
        className="inline-flex items-center gap-1 text-[13px] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors duration-150 mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Announcements
      </Link>

      <h1 className="text-[28px] font-bold tracking-[-0.02em] text-[var(--text-1)] mb-6">
        Edit Announcement
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
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={6}
            className="input-field min-h-[140px] text-[13px]"
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--focus-ring)]"
          />
          <span className="text-[13px] text-[var(--text-2)]">Pinned</span>
        </label>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" loading={loading} className="flex-1">
            Save Changes
          </Button>
          <Link href="/admin/announcements">
            <Button type="button" variant="secondary">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
