"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
        <Button variant="ghost" size="sm">
          Edit
        </Button>
      </Link>
      {!showConfirm ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowConfirm(true)}
        >
          Delete
        </Button>
      ) : (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="danger"
            onClick={handleDelete}
            loading={deleting}
          >
            Confirm
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowConfirm(false)}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
