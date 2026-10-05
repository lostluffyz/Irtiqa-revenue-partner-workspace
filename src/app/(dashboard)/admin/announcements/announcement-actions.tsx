"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { deleteAnnouncementAction } from "./actions";

interface AnnouncementActionsProps {
  id: string;
}

export function AnnouncementActions({
  id,
}: AnnouncementActionsProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const deleteBtnRef = useRef<HTMLButtonElement>(null);

  const closeConfirm = () => {
    setShowConfirm(false);
    deleteBtnRef.current?.focus();
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const formData = new FormData();
      formData.set("id", id);
      const result = await deleteAnnouncementAction(null, formData);
      if (!result.success) {
        alert(result.error);
      }
      router.refresh();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
    setDeleting(false);
    setShowConfirm(false);
  };

  return (
    <div className="flex items-center gap-1 shrink-0">
      <Link
        href={`/admin/announcements/edit/${id}`}
      >
        <Button variant="ghost" size="sm" className="min-h-[44px] md:min-h-0">
          Edit
        </Button>
      </Link>
      <Button
        ref={deleteBtnRef}
        variant="ghost"
        size="sm"
        onClick={() => setShowConfirm(true)}
        className="min-h-[44px] md:min-h-0"
      >
        Delete
      </Button>
      <Dialog
        open={showConfirm}
        onOpenChange={(open) => {
          if (!open) closeConfirm();
        }}
      >
        <DialogContent className="max-w-md rounded-[20px]">
          <DialogClose onClose={closeConfirm} />
          <DialogHeader>
            <DialogTitle>Delete this announcement?</DialogTitle>
            <DialogDescription>
              Partners will no longer see it. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={closeConfirm}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={handleDelete}
              loading={deleting}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
