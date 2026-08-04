"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogClose,
  Button,
} from "@/components/ui";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { deletePartnerAction } from "./actions";

/* ═══════════════════════════════════════════════════════════════
   DeletePartnerDialog — Premium enterprise destructive action

   • Requires typing the partner's full name to enable the button
   • Shows partner summary card for identity confirmation
   • Styled warning card with all data that will be removed
   • Disables buttons during submission
   • Shows success/error toast
   • Redirects to /admin/partners on success
   ═══════════════════════════════════════════════════════════════ */

interface DeletePartnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerId: string;
  partnerName: string;
  companyId: string;
  email: string;
  region: string;
  status: string;
}

const DESTRUCTED_ITEMS = [
  "Partner Account",
  "Assigned Leads",
  "Daily Reports",
  "Activity History",
  "Compliance Records",
  "Future associations",
];

const STATUS_VARIANT: Record<string, "success" | "warning" | "danger"> = {
  active: "success",
  inactive: "warning",
  suspended: "danger",
};

export function DeletePartnerDialog({
  open,
  onOpenChange,
  partnerId,
  partnerName,
  companyId,
  email,
  region,
  status,
}: DeletePartnerDialogProps) {
  const router = useRouter();
  const { toast } = useToast();

  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNameMatch = confirmText === partnerName;
  const canDelete = isNameMatch && !isDeleting;

  const handleDelete = useCallback(async () => {
    if (!canDelete) return;

    setIsDeleting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("partnerId", partnerId);
      formData.set("partnerName", partnerName);

      const result = await deletePartnerAction(null, formData);

      if (result?.error) {
        setError(result.error);
        setIsDeleting(false);
        return;
      }

      // Success
      onOpenChange(false);
      setConfirmText("");

      toast({
        title: "Partner deleted successfully.",
        variant: "success",
      });

      router.push("/admin/partners");
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setIsDeleting(false);
    }
  }, [canDelete, partnerId, partnerName, onOpenChange, toast, router]);

  const handleClose = useCallback(() => {
    if (isDeleting) return;
    onOpenChange(false);
    setConfirmText("");
    setError(null);
  }, [isDeleting, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[650px] p-0 overflow-hidden">
        {/* ── Header ── */}
        <div className="flex items-start gap-4 px-8 pt-8 pb-0">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-50 border border-red-100 shrink-0">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-[18px] font-semibold tracking-[-0.01em] text-[var(--text-1)]">
              Delete Partner
            </h2>
            <p className="text-[13px] text-[var(--text-3)] mt-0.5 leading-relaxed">
              This action is permanent and cannot be undone.
            </p>
          </div>
        </div>

        <DialogClose onClose={handleClose} />

        {/* ── Body ── */}
        <div className="px-8 py-6 space-y-6">
          {/* ── Partner Summary Card ── */}
          <div className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--canvas)]">
            <Avatar name={partnerName} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2.5">
                <p className="text-[15px] font-semibold text-[var(--text-1)] truncate">
                  {partnerName}
                </p>
                <Badge variant={STATUS_VARIANT[status] || "default"}>
                  {status}
                </Badge>
              </div>
              <div className="flex items-center gap-3 mt-1 text-[12px] text-[var(--text-3)]">
                <code
                  className="font-medium"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {companyId}
                </code>
                <span className="text-[var(--border)]">·</span>
                <span className="truncate">{email}</span>
                {region && (
                  <>
                    <span className="text-[var(--border)]">·</span>
                    <span>{region}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ── Warning Card ── */}
          <div className="rounded-xl border border-red-200 bg-red-50/50 overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-3 border-b border-red-100 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <p className="text-[13px] font-semibold text-red-800">
                Permanent Deletion
              </p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[13px] text-red-900/80 mb-3">
                Deleting this partner will permanently remove:
              </p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                {DESTRUCTED_ITEMS.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-[13px]"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-red-400 shrink-0" />
                    <span className="text-red-800">{item}</span>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-red-700/60 mt-4 font-medium">
                This action cannot be undone.
              </p>
            </div>
          </div>

          {/* ── Confirmation Input ── */}
          <div className="space-y-2.5">
            <label className="text-[14px] text-[var(--text-1)]">
              Type{" "}
              <span className="font-semibold text-[var(--text-1)]">
                {partnerName}
              </span>{" "}
              to confirm deletion.
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => {
                setConfirmText(e.target.value);
                setError(null);
              }}
              placeholder={partnerName}
              className="input-field w-full text-[14px] h-11"
              autoFocus
              disabled={isDeleting}
            />
            <p className="text-[12px] text-[var(--text-3)]">
              The Delete button will only become available after the partner
              name matches exactly.
            </p>
          </div>

          {/* ── Error ── */}
          {error && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-200">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
              <p className="text-[13px] text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-3 px-8 py-5 border-t border-[var(--border-subtle)] bg-[var(--canvas)]">
          <Button
            variant="secondary"
            size="md"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            size="md"
            onClick={handleDelete}
            disabled={!canDelete}
            loading={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            Delete Partner
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
