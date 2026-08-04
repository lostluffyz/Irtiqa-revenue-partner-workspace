"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  resetPasswordAction,
  updatePartnerStatusAction,
  updatePartnerRegionAction,
} from "./actions";

const STATUS_VARIANTS: Record<string, "success" | "warning" | "danger" | "default"> = {
  active: "success",
  inactive: "warning",
  suspended: "danger",
};

interface PartnerRow {
  id: string;
  company_id: string;
  status: string;
  created_at: string;
  last_login_at: string | null;
  phone: string | null;
  region_id: string | null;
  profiles: { full_name: string; email: string; is_active: boolean } | null;
  regions: { id: string; name: string } | null;
  leadCount: number;
}

interface Region {
  id: string;
  name: string;
}

export function PartnerActions({
  partner,
  regions,
}: {
  partner: PartnerRow;
  regions: Region[];
}) {
  const router = useRouter();
  const [showResetPwd, setShowResetPwd] = useState(false);
  const [resetPwdResult, setResetPwdResult] = useState<string | null>(null);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showRegionMenu, setShowRegionMenu] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const handleResetPassword = async (formData: FormData) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await resetPasswordAction(null, formData);
    if (result?.newPassword) {
      setResetPwdResult(result.newPassword);
    } else {
      alert(result?.error || "Failed to reset password");
    }
  };

  const handleStatusChange = async (status: string) => {
    setStatusLoading(true);
    const formData = new FormData();
    formData.set("partnerId", partner.id);
    formData.set("status", status);
    const result = await updatePartnerStatusAction(null, formData);
    setStatusLoading(false);
    setShowStatusMenu(false);
    if ("error" in result && result.error) {
      alert(result.error);
    }
    router.refresh();
  };

  const handleRegionChange = async (formData: FormData) => {
    formData.set("partnerId", partner.id);
    const result = await updatePartnerRegionAction(null, formData);
    setShowRegionMenu(false);
    if ("error" in result && result.error) {
      alert(result.error);
    }
    router.refresh();
  };

  const displayName = partner.profiles?.full_name || partner.company_id;
  const displayRegion = partner.regions?.name || "—";

  return (
    <TableRow>
      <TableCell className="font-medium text-[var(--text-1)]">{displayName}</TableCell>
      <TableCell>
        <code className="rounded-[4px] bg-[var(--canvas)] px-1.5 py-0.5 text-[11px] text-[var(--text-2)]" style={{ fontFamily: "var(--font-mono)" }}>
          {partner.company_id}
        </code>
      </TableCell>
      <TableCell className="text-[12px] text-[var(--text-3)]">{displayRegion}</TableCell>
      <TableCell>
        <Badge variant={STATUS_VARIANTS[partner.status] || "default"}>
          {partner.status}
        </Badge>
      </TableCell>
      <TableCell className="text-right tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
        {partner.leadCount}
      </TableCell>
      <TableCell>
        {partner.profiles?.is_active ? (
          <Badge variant="success">Active</Badge>
        ) : (
          <Badge variant="danger">Inactive</Badge>
        )}
      </TableCell>
      <TableCell className="text-[11px] text-[var(--text-3)] tabular-nums" style={{ fontFamily: "var(--font-mono)" }}>
        {new Date(partner.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-0.5">
          {/* Reset Password */}
          {!showResetPwd ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResetPwd(true)}
            >
              Reset Pwd
            </Button>
          ) : (
            <div className="flex items-center gap-1">
              {resetPwdResult ? (
                <div className="flex items-center gap-1">
                  <span className="text-[11px] text-[var(--status-success)]">Password set</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowResetPwd(false);
                      setResetPwdResult(null);
                    }}
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={async (event: React.FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    formData.set("partnerId", partner.id);
                    await handleResetPassword(formData);
                  }}
                  className="flex items-center gap-1"
                >
                  <input type="hidden" name="partnerId" value={partner.id} />
                  <input
                    type="password"
                    name="newPassword"
                    placeholder="New password"
                    className="input-field w-28 text-[11px]"
                    required
                    minLength={8}
                  />
                  <Button type="submit" size="sm">
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowResetPwd(false)}
                  >
                    Cancel
                  </Button>
                </form>
              )}
            </div>
          )}

          {/* Status change */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              disabled={statusLoading}
            >
              Status
            </Button>
            {showStatusMenu && (
              <div className="absolute right-0 z-50 mt-1 w-36 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                {["active", "inactive", "suspended"].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className={`block w-full px-4 py-2 text-left text-[12px] transition-colors duration-150 hover:bg-[var(--hover-bg)] first:rounded-t-[7px] last:rounded-b-[7px] ${
                      partner.status === s ? "font-medium text-[var(--accent)]" : "text-[var(--text-2)]"
                    }`}
                  >
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Region change */}
          <div className="relative">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRegionMenu(!showRegionMenu)}
            >
              Region
            </Button>
            {showRegionMenu && (
              <div className="absolute right-0 z-50 mt-1 w-48 rounded-[8px] bg-[var(--surface)] border border-[var(--border)] shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
                <form onSubmit={async (event: React.FormEvent<HTMLFormElement>) => {
                    event.preventDefault();
                    const formData = new FormData(event.currentTarget);
                    await handleRegionChange(formData);
                  }}>
                  <input type="hidden" name="partnerId" value={partner.id} />
                  <div className="p-2">
                    <select
                      name="regionId"
                      defaultValue={partner.region_id || ""}
                      className="input-field w-full text-[12px]"
                    >
                      <option value="">No region</option>
                      {regions.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2 flex gap-1">
                      <Button type="submit" size="sm">
                        Save
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setShowRegionMenu(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
