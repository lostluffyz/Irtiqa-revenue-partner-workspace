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
import { deleteResourceAction } from "./actions";

interface ResourceActionsProps {
  id: string;
  title: string;
  description: string;
  type: string;
  url: string;
  sortOrder: number;
  isActive: boolean;
}

export function ResourceActions(resource: ResourceActionsProps) {
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
      formData.set("id", resource.id);
      const result = await deleteResourceAction(null, formData);
      if (!result.success) {
        alert(result.error);
      }
      router.refresh();
    } catch {
      console.error("Failed to delete resource");
    }
    setDeleting(false);
    setShowConfirm(false);
  };

  return (
    <div className="flex items-center gap-1">
      <Link href={`/admin/resources/edit/${resource.id}`}>
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
            <DialogTitle>Delete this resource?</DialogTitle>
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
