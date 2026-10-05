"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/ui/form-error";
import { PageHeader } from "@/components/ui/page-header";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createAnnouncementAction } from "../actions";

export default function NewAnnouncementPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.set("title", title);
    formData.set("content", content);
    formData.set("isPinned", String(isPinned));

    const result = await createAnnouncementAction(null, formData);
    if (result.success) {
      router.push("/admin/announcements");
      router.refresh();
    } else {
      setError(result.error || "Failed to create announcement");
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-[720px]">
      <Link
        href="/admin/announcements"
        className="inline-flex items-center gap-1 text-[13px] text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors duration-150 mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Announcements
      </Link>

      <PageHeader
        title="New Announcement"
        description="Publish an update for your partners."
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
            placeholder="e.g., New Weekly Leads Uploaded"
            maxLength={300}
          />
          <p className="mt-1 text-right text-[11px] tabular-nums text-[var(--text-3)]">
            {title.length} / 300
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="block text-[13px] font-medium text-[var(--text-2)]">
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
            rows={6}
            placeholder="Write announcement content..."
            className="input-field min-h-[160px] text-[13px]"
          />
        </div>

        <div className="space-y-1.5">
          <button
            type="button"
            role="switch"
            aria-checked={isPinned}
            aria-label="Pin this announcement"
            onClick={() => setIsPinned((v) => !v)}
            className="flex min-h-[44px] items-center gap-3"
          >
            <span
              aria-hidden="true"
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 ${
                isPinned ? "bg-[var(--accent)]" : "bg-[var(--border)]"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform duration-150 ${
                  isPinned ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </span>
            <span className="text-left">
              <span className="block text-[13px] font-medium text-[var(--text-1)]">
                Pin this announcement
              </span>
              <span className="block text-[12px] text-[var(--text-3)]">
                Pinned announcements appear first for partners.
              </span>
            </span>
          </button>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" loading={loading} className="flex-1 min-h-[44px]">
            Publish announcement
          </Button>
          <Link href="/admin/announcements">
            <Button type="button" variant="secondary" className="min-h-[44px]">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
