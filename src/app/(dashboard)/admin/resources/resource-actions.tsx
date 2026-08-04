"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
