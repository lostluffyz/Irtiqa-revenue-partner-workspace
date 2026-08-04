"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={loading}
      className="flex h-[36px] items-center justify-center rounded-[8px] border border-[var(--border)] bg-[var(--surface)] px-3 text-[13px] font-medium text-[var(--text-2)] transition-all duration-150 hover:bg-[var(--hover-bg)] hover:text-[var(--text-1)] disabled:opacity-50"
    >
      {loading ? "Signing out..." : "Sign Out"}
    </button>
  );
}
