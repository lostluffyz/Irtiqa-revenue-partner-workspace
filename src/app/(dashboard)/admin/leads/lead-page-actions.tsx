"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { SmartAssignDialog } from "./smart-assign/smart-assign-dialog";
import type { ActivePartner } from "./lead-filters";

/**
 * LeadPageActions — Client wrapper for header action buttons.
 * Renders the "Assign Leads" button that opens the Smart Assignment Dialog.
 * Placed in the server-component page via this client bridge.
 */
export function LeadPageActions({
  activePartners,
}: {
  activePartners: ActivePartner[];
}) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleComplete = useCallback(() => {
    router.refresh();
  }, [router]);

  return (
    <>
      <Button
        size="sm"
        onClick={() => setDialogOpen(true)}
        className="dl-press min-h-[44px] md:min-h-0"
      >
        <Sparkles className="h-3.5 w-3.5" />
        Assign Leads
      </Button>

      <SmartAssignDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        activePartners={activePartners}
        onComplete={handleComplete}
      />
    </>
  );
}
