"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Check, Loader2 } from "lucide-react";
import { updateLeadNotesAction } from "../actions";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface LeadNotesProps {
  leadId: string;
  initialNotes: string;
}

export function LeadNotes({ leadId, initialNotes }: LeadNotesProps) {
  const [notes, setNotes] = useState(initialNotes);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef(initialNotes);

  const save = useCallback(
    async (value: string) => {
      if (value === lastSavedRef.current) {
        setStatus("idle");
        return;
      }

      setStatus("saving");
      // Success vs failure comes straight from the existing action's
      // return value: { error } means the save was rejected.
      const result = await updateLeadNotesAction(leadId, value);

      if (result.error) {
        setStatus("error");
        return;
      }

      lastSavedRef.current = value;
      setStatus("saved");

      // Reset to idle after 2 seconds
      setTimeout(() => {
        setStatus((prev) => (prev === "saved" ? "idle" : prev));
      }, 2000);
    },
    [leadId],
  );

  // Debounced autosave
  useEffect(() => {
    if (notes === lastSavedRef.current) return;

    setStatus("saving");

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      save(notes);
    }, 500);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [notes, save]);

  return (
    <div className="space-y-1.5">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Write private notes about this lead..."
        rows={4}
        className="w-full px-3 py-2 text-[12px] leading-relaxed min-h-[120px]
          bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-soft-md)]
          text-[var(--text-1)] placeholder:text-[var(--text-3)]
          resize-none
          transition-all duration-150
          hover:border-[var(--accent)]
          focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-0 focus:border-[var(--accent)]"
      />
      <p className="text-[11px] text-[var(--text-3)]">
        Only visible to you and your admin.
      </p>
      <div className="flex items-center justify-end min-h-4 gap-2">
        {status === "error" ? (
          <span role="alert" className="inline-flex items-center gap-1.5 text-[12.5px] text-[var(--status-danger)]">
            Couldn&apos;t save. Your note was not saved.
            <button
              type="button"
              onClick={() => save(notes)}
              className="font-medium underline underline-offset-2 hover:text-[var(--text-1)] focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-2 rounded-[4px]"
            >
              Retry
            </button>
          </span>
        ) : (
          <span
            className={`inline-flex items-center gap-1 text-[10px] tabular-nums transition-all duration-200 ${
              status === "saving"
                ? "text-[var(--text-3)]"
                : status === "saved"
                  ? "text-[var(--status-success)]"
                  : "text-transparent"
            }`}
          >
            {status === "saving" && (
              <>
                <Loader2 className="h-3 w-3 animate-spin" />
                Saving...
              </>
            )}
            {status === "saved" && (
              <>
                <Check className="h-3 w-3" />
                Saved
              </>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
