"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Badge, Button, EmptyState, ReportStatusChip } from "@/components/ui";
import { DataCard, DataCardColumn } from "@/components/ui/data-card";
import type { ReportStatus } from "@/lib/compliance";
import Link from "next/link";
import {
  MapPin,
  Users,
  Building2,
  MoreHorizontal,
  ChevronRight,
  Key,
  Shield,
  ShieldOff,
  Pause,
  MapPinned,
  X,
  CheckCircle2,
  Check,
  ArrowRight,
  Copy,
  Trash2,
} from "lucide-react";
import {
  resetPasswordAction,
  updatePartnerStatusAction,
  updatePartnerRegionAction,
} from "./actions";
import { DeletePartnerDialog } from "./delete-partner-dialog";

/* ═══════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════ */
export interface PartnerRow {
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
  reportStatus?: ReportStatus;
}

export interface Region {
  id: string;
  name: string;
}

interface PartnerListProps {
  partners: PartnerRow[];
  regions: Region[];
}

/* ═══════════════════════════════════════════════════════════════
   Status Config
   ═══════════════════════════════════════════════════════════════ */
const STATUS_CONFIG: Record<string, { variant: "success" | "warning" | "danger" | "default"; label: string }> = {
  active: { variant: "success", label: "Active" },
  inactive: { variant: "warning", label: "Inactive" },
  suspended: { variant: "danger", label: "Suspended" },
};

function getStatusConfig(status: string) {
  return STATUS_CONFIG[status] || { variant: "default" as const, label: status };
}

/* ═══════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════ */
function formatRelativeDate(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return "yesterday";
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/* ═══════════════════════════════════════════════════════════════
   Partner Card — Using DataCard, information hierarchy
   ═══════════════════════════════════════════════════════════════ */
function PartnerCard({
  partner,
  onOpenMenu,
}: {
  partner: PartnerRow;
  onOpenMenu: (id: string) => void;
}) {
  const router = useRouter();
  const displayName = partner.profiles?.full_name || partner.company_id;
  const statusConfig = getStatusConfig(partner.status);

  return (
    <div className="group relative">
      <DataCard
        className="group cursor-pointer"
        onClick={() => router.push(`/admin/partners/${partner.id}`)}
      >
        {/* Avatar */}
        <Avatar name={displayName} size="md" />

        {/* Primary: Name + metadata */}
        <DataCardColumn primary>
          {/* Row 1: Name (dominant) + Status pill */}
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/partners/${partner.id}`}
              className="dl-type-body font-semibold text-[var(--text-1)] truncate hover:text-[var(--accent)] transition-colors duration-100"
            >
              {displayName}
            </Link>
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </div>

          {/* Row 2: Metadata — recedes visually */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <code
              className="dl-type-micro normal-case tracking-normal"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {partner.company_id}
            </code>
            {partner.profiles?.email && !partner.profiles.email.endsWith("@rp.irtiqa.internal") && (
              <>
                <span className="dl-type-micro text-[var(--text-3)]">·</span>
                <span className="dl-type-caption text-[var(--text-3)] truncate max-w-[180px]">
                  {partner.profiles.email}
                </span>
              </>
            )}
            {partner.regions && (
              <>
                <span className="dl-type-micro text-[var(--text-3)] hidden sm:inline">·</span>
                <span className="hidden sm:inline-flex items-center gap-1 dl-type-caption text-[var(--text-3)]">
                  <MapPin className="h-3 w-3" />
                  {partner.regions.name}
                </span>
              </>
            )}
            {partner.reportStatus && (
              <>
                <span className="dl-type-micro text-[var(--text-3)] hidden sm:inline">·</span>
                <span className="hidden sm:inline-flex items-center gap-1.5">
                  <span className="dl-type-micro normal-case tracking-normal text-[var(--text-3)]">
                    Report
                  </span>
                  <ReportStatusChip status={partner.reportStatus} />
                </span>
              </>
            )}
          </div>
        </DataCardColumn>

        {/* Metrics — right side */}
        <div className="hidden md:flex items-center gap-6 shrink-0">
          <div className="text-right min-w-[56px]">
            <p className="dl-type-body font-semibold dl-tabular text-[var(--text-1)]">
              {partner.leadCount}
            </p>
            <p className="dl-type-micro normal-case tracking-normal">leads</p>
          </div>
          <div className="text-right min-w-[80px]">
            <p className="dl-type-caption dl-tabular text-[var(--text-3)]">
              {formatRelativeDate(partner.last_login_at)}
            </p>
            <p className="dl-type-micro normal-case tracking-normal">last active</p>
          </div>
        </div>

        {/* Actions — always visible on mobile, hover-reveal on desktop */}
        <div className="flex items-center gap-1 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-150">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenMenu(partner.id);
            }}
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)] transition-colors duration-100 focus-visible:outline-2 focus-visible:outline-[var(--accent)] focus-visible:outline-offset-[-2px]"
            aria-label="Actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-3)]" aria-hidden="true" />
        </div>
      </DataCard>

      {/* Mobile extras */}
      <div className="flex md:hidden items-center gap-2 ml-[52px] mt-1 mb-2">
        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
        {partner.reportStatus && (
          <ReportStatusChip status={partner.reportStatus} />
        )}
        <span className="dl-type-caption text-[var(--text-3)] tabular-nums">
          {partner.leadCount} leads
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Command Menu — Partner-specific with reset password sub-view
   Uses design tokens for consistency with shared CommandMenu
   ═══════════════════════════════════════════════════════════════ */
function PartnerCommandMenu({
  partner,
  regions,
  resetPwdPartnerId,
  resetPwdResult,
  statusLoading,
  copiedField,
  onResetPassword,
  onStatusChange,
  onRegionChange,
  onOpenDeleteDialog,
  onSetResetPwdPartnerId,
  onSetResetPwdResult,
  onCopy,
  onClose,
}: {
  partner: PartnerRow;
  regions: Region[];
  resetPwdPartnerId: string | null;
  resetPwdResult: string | null;
  statusLoading: string | null;
  copiedField: string | null;
  onResetPassword: (partnerId: string, formData: FormData) => void;
  onStatusChange: (partnerId: string, status: string) => void;
  onRegionChange: (partnerId: string, regionId: string) => void;
  onOpenDeleteDialog: (partner: PartnerRow) => void;
  onSetResetPwdPartnerId: (id: string | null) => void;
  onSetResetPwdResult: (result: string | null) => void;
  onCopy: (text: string, field: string) => void;
  onClose: () => void;
}) {
  const isResetMode = resetPwdPartnerId === partner.id;
  const displayName = partner.profiles?.full_name || partner.company_id;

  return (
    <div className="absolute right-0 top-full mt-1 w-[300px] dl-surface dl-elevate-3 z-50 overflow-hidden dl-dropdown-enter">
      {isResetMode ? (
        /* ── Reset Password Sub-view ── */
        <div>
          <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-[var(--border-subtle)]">
            <div className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--status-warning-bg)]">
              <Key className="h-3 w-3 text-[var(--status-warning)]" />
            </div>
            <div>
              <p className="dl-type-body font-medium text-[var(--text-1)]">Reset Password</p>
              <p className="dl-type-micro normal-case tracking-normal">{displayName}</p>
            </div>
          </div>

          <div className="p-2.5">
            {resetPwdResult ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-2.5 py-2 rounded-[var(--radius-sm)] bg-[var(--status-success-bg)] border border-emerald-200">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[var(--status-success)] shrink-0" />
                  <p className="dl-type-body font-medium text-emerald-800">Password updated</p>
                </div>
                <div className="relative">
                  <p
                    className="dl-type-body bg-[var(--canvas)] px-2.5 py-2 rounded-[var(--radius-sm)] border border-[var(--border-subtle)] break-all pr-12"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {resetPwdResult}
                  </p>
                  <button
                    onClick={() => onCopy(resetPwdResult, "password")}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1 p-1 rounded-[var(--radius-sm)] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-white transition-colors duration-100"
                    title="Copy password"
                  >
                    {copiedField === "password" ? (
                      <>
                        <CheckCircle2 className="h-3 w-3 text-[var(--status-success)]" />
                        <span className="dl-type-micro text-[var(--status-success)] normal-case tracking-normal">Copied</span>
                      </>
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
                <button
                  onClick={() => {
                    onSetResetPwdPartnerId(null);
                    onSetResetPwdResult(null);
                  }}
                  className="w-full h-[32px] rounded-[var(--radius-sm)] bg-[var(--canvas)] border border-[var(--border-subtle)] dl-type-body font-medium text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-[var(--border)] transition-colors duration-100"
                >
                  Done
                </button>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  await onResetPassword(partner.id, formData);
                }}
                className="space-y-2"
              >
                <input type="hidden" name="partnerId" value={partner.id} />
                <div>
                  <label className="dl-type-micro mb-1 block">New Password</label>
                  <input
                    type="password"
                    name="newPassword"
                    placeholder="Minimum 8 characters"
                    className="input-field text-[13px] h-[32px]"
                    required
                    minLength={8}
                    autoFocus
                  />
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="submit"
                    className="flex-1 h-[32px] rounded-[var(--radius-sm)] bg-[var(--accent)] text-white dl-type-body font-medium hover:bg-[var(--accent-hover)] transition-colors duration-100"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => onSetResetPwdPartnerId(null)}
                    className="px-3 h-[32px] rounded-[var(--radius-sm)] bg-[var(--canvas)] border border-[var(--border-subtle)] dl-type-body font-medium text-[var(--text-2)] hover:text-[var(--text-1)] hover:border-[var(--border)] transition-colors duration-100"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : (
        /* ── Main Command Menu ── */
        <>
          {/* Header */}
          <div className="px-3 py-2.5 border-b border-[var(--border-subtle)]">
            <div className="flex items-center gap-2.5">
              <Avatar name={displayName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="dl-type-body font-medium text-[var(--text-1)] truncate">
                  {displayName}
                </p>
                <p className="dl-type-micro normal-case tracking-normal" style={{ fontFamily: "var(--font-mono)" }}>
                  {partner.company_id}
                </p>
              </div>
              <Link
                href={`/admin/partners/${partner.id}`}
                className="p-1 rounded-[var(--radius-sm)] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)] transition-colors duration-100"
                title="View profile"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="py-0.5 px-1">
            {/* Actions section */}
            <div className="px-2 pt-1.5 pb-0.5">
              <span className="dl-type-micro">Actions</span>
            </div>

            <button
              onClick={() => {
                onSetResetPwdPartnerId(partner.id);
                onSetResetPwdResult(null);
              }}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-[var(--radius-sm)] dl-type-body text-[var(--text-2)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-1)] transition-colors duration-100 group"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--status-warning-bg)]">
                <Key className="h-3 w-3 text-[var(--status-warning)]" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Reset Password</p>
                <p className="dl-type-micro normal-case tracking-normal">Set a new password</p>
              </div>
            </button>

            <Link
              href={`/admin/partners/${partner.id}`}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-[var(--radius-sm)] dl-type-body text-[var(--text-2)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-1)] transition-colors duration-100 group"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--accent-light)]">
                <ArrowRight className="h-3 w-3 text-[var(--accent)]" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">View Profile</p>
                <p className="dl-type-micro normal-case tracking-normal">Open partner details</p>
              </div>
            </Link>

            {/* Status section */}
            <div className="mx-1.5 my-0.5 h-px bg-[var(--border-subtle)]" />
            <div className="px-2 pt-1 pb-0.5">
              <span className="dl-type-micro">Status</span>
            </div>

            {[
              { value: "active", icon: Shield, label: "Active", desc: "Operational" },
              { value: "inactive", icon: Pause, label: "Inactive", desc: "Temporarily paused" },
              { value: "suspended", icon: ShieldOff, label: "Suspended", desc: "Access revoked" },
            ].map(({ value, icon: Icon, label, desc }) => (
              <button
                key={value}
                onClick={() => onStatusChange(partner.id, value)}
                disabled={statusLoading === partner.id}
                className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-[var(--radius-sm)] dl-type-body transition-colors duration-100 group ${
                  partner.status === value
                    ? "bg-[var(--accent-light)] text-[var(--accent)]"
                    : "text-[var(--text-2)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-1)]"
                }`}
              >
                <div className={`flex h-5 w-5 items-center justify-center rounded-[var(--radius-sm)] ${
                  partner.status === value ? "bg-[var(--accent)]/10" : "bg-[var(--canvas)] group-hover:bg-[var(--border-subtle)]"
                } transition-colors duration-100`}>
                  <Icon className="h-3 w-3" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{label}</p>
                  <p className="dl-type-micro normal-case tracking-normal">{desc}</p>
                </div>
                {statusLoading === partner.id ? (
                  <svg className="h-3 w-3 animate-spin text-[var(--text-3)]" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : partner.status === value ? (
                  <Check className="h-3 w-3 text-[var(--accent)]" />
                ) : null}
              </button>
            ))}

            {/* Region section */}
            <div className="mx-1.5 my-0.5 h-px bg-[var(--border-subtle)]" />
            <div className="px-2 pt-1 pb-0.5">
              <span className="dl-type-micro">Region</span>
            </div>

            <button
              onClick={() => onRegionChange(partner.id, "")}
              className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-[var(--radius-sm)] dl-type-body transition-colors duration-100 group ${
                !partner.region_id
                  ? "bg-[var(--accent-light)] text-[var(--accent)]"
                  : "text-[var(--text-2)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-1)]"
              }`}
            >
              <div className={`flex h-5 w-5 items-center justify-center rounded-[var(--radius-sm)] ${
                !partner.region_id ? "bg-[var(--accent)]/10" : "bg-[var(--canvas)] group-hover:bg-[var(--border-subtle)]"
              } transition-colors duration-100`}>
                <X className="h-3 w-3" />
              </div>
              <span className="font-medium">No Region</span>
              {!partner.region_id && (
                <Check className="ml-auto h-3 w-3 text-[var(--accent)]" />
              )}
            </button>

            {regions.map((r) => (
              <button
                key={r.id}
                onClick={() => onRegionChange(partner.id, r.id)}
                className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-[var(--radius-sm)] dl-type-body transition-colors duration-100 group ${
                  partner.region_id === r.id
                    ? "bg-[var(--accent-light)] text-[var(--accent)]"
                    : "text-[var(--text-2)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-1)]"
                }`}
              >
                <div className={`flex h-5 w-5 items-center justify-center rounded-[var(--radius-sm)] ${
                  partner.region_id === r.id ? "bg-[var(--accent)]/10" : "bg-[var(--canvas)] group-hover:bg-[var(--border-subtle)]"
                } transition-colors duration-100`}>
                  <MapPinned className="h-3 w-3" />
                </div>
                <span className="font-medium">{r.name}</span>
                {partner.region_id === r.id && (
                  <Check className="ml-auto h-3 w-3 text-[var(--accent)]" />
                )}
              </button>
            ))}

            {/* Danger zone — Delete */}
            <div className="mx-1.5 my-0.5 h-px bg-red-200" />
            <button
              onClick={() => onOpenDeleteDialog(partner)}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-[var(--radius-sm)] dl-type-body text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-100 group"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-[var(--radius-sm)] bg-red-100 group-hover:bg-red-200 transition-colors duration-100">
                <Trash2 className="h-3 w-3" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Delete Partner</p>
                <p className="dl-type-micro normal-case tracking-normal">Permanently remove</p>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Partner List
   ═══════════════════════════════════════════════════════════════ */
export function PartnerList({ partners, regions }: PartnerListProps) {
  const router = useRouter();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [resetPwdPartnerId, setResetPwdPartnerId] = useState<string | null>(null);
  const [resetPwdResult, setResetPwdResult] = useState<string | null>(null);
  const [statusLoading, setStatusLoading] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePartnerData, setDeletePartnerData] = useState<PartnerRow | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const handleCopy = useCallback(async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  // Close menu on outside click or Escape
  useEffect(() => {
    if (!openMenuId) return;
    function handleClick(e: MouseEvent) {
      if (listRef.current && !listRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenuId]);

  const handleResetPassword = async (partnerId: string, formData: FormData) => {
    formData.set("partnerId", partnerId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await resetPasswordAction(null, formData);
    if (result?.error) {
      setResetPwdResult(null);
      // Error will be shown via the form staying open — user can retry
      return;
    }
    if (result?.newPassword) {
      setResetPwdResult(result.newPassword);
    }
  };

  const handleStatusChange = async (partnerId: string, status: string) => {
    setStatusLoading(partnerId);
    try {
      const formData = new FormData();
      formData.set("partnerId", partnerId);
      formData.set("status", status);
      const result = await updatePartnerStatusAction(null, formData);
      if (result && typeof result === "object" && "error" in result && result.error) {
        // Error occurred — keep menu open so user sees the state
        setStatusLoading(null);
        return;
      }
      setOpenMenuId(null);
      router.refresh();
    } catch {
      // Network error — keep menu open
    } finally {
      setStatusLoading(null);
    }
  };

  const handleRegionChange = async (partnerId: string, regionId: string) => {
    try {
      const formData = new FormData();
      formData.set("partnerId", partnerId);
      formData.set("regionId", regionId);
      const result = await updatePartnerRegionAction(null, formData);
      if (result && typeof result === "object" && "error" in result && result.error) {
        return;
      }
      setOpenMenuId(null);
      router.refresh();
    } catch {
      // Network error — keep menu open
    }
  };

  const handleOpenDeleteDialog = useCallback((partner: PartnerRow) => {
    setOpenMenuId(null);
    setDeletePartnerData(partner);
    setDeleteDialogOpen(true);
  }, []);

  return (
    <div ref={listRef}>
      {/* Partner Cards */}
      <div className="space-y-1">
        {partners.map((partner) => (
          <div key={partner.id} className="relative">
            <PartnerCard
              partner={partner}
              onOpenMenu={(id) => setOpenMenuId(openMenuId === id ? null : id)}
            />
            {openMenuId === partner.id && (
              <PartnerCommandMenu
                partner={partner}
                regions={regions}
                resetPwdPartnerId={resetPwdPartnerId}
                resetPwdResult={resetPwdResult}
                statusLoading={statusLoading}
                copiedField={copiedField}
                onResetPassword={handleResetPassword}
                onStatusChange={handleStatusChange}
                onRegionChange={handleRegionChange}
                onOpenDeleteDialog={handleOpenDeleteDialog}
                onSetResetPwdPartnerId={setResetPwdPartnerId}
                onSetResetPwdResult={setResetPwdResult}
                onCopy={handleCopy}
                onClose={() => setOpenMenuId(null)}
              />
            )}
          </div>
        ))}
      </div>

      {/* Delete Partner Dialog */}
      {deletePartnerData && (
        <DeletePartnerDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) setDeletePartnerData(null);
          }}
          partnerId={deletePartnerData.id}
          partnerName={deletePartnerData.profiles?.full_name || deletePartnerData.company_id}
          companyId={deletePartnerData.company_id}
          email={deletePartnerData.profiles?.email || ""}
          region={deletePartnerData.regions?.name || "—"}
          status={deletePartnerData.status}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   Empty State — Using shared EmptyState component
   ═══════════════════════════════════════════════════════════════ */
export function PartnersEmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="dl-surface py-24">
      <EmptyState
        icon={<Users className="h-8 w-8" />}
        title={hasFilters ? "No partners match your filters" : "No partners yet"}
        description={
          hasFilters
            ? "Try adjusting your search or filters to find what you're looking for."
            : "Start building your partner network by adding your first revenue partner."
        }
        action={
          !hasFilters ? (
            <Link href="/admin/partners/create">
              <Button className="dl-press">
                <Building2 className="h-3.5 w-3.5" />
                Add Partner
              </Button>
            </Link>
          ) : undefined
        }
      />
    </div>
  );
}
