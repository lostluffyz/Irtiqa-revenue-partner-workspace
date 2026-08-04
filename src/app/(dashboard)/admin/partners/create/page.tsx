"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/ui/form-error";
import {
  ArrowLeft,
  CheckCircle2,
  User,
  Shield,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { createPartnerAction } from "../actions";

interface Region {
  id: string;
  name: string;
}

export default function CreatePartnerPage() {
  const router = useRouter();
  const [regions, setRegions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    error?: string;
    success?: boolean;
    companyId?: string;
    password?: string;
  } | null>(null);
  const [name, setName] = useState("");
  const [regionId, setRegionId] = useState("");
  const [phone, setPhone] = useState("");
  const [customPassword, setCustomPassword] = useState("");
  const [useCustomPassword, setUseCustomPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("regions")
      .select("*")
      .order("name")
      .then(({ data }) => {
        if (data) setRegions(data);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.set("fullName", name);
    formData.set("regionId", regionId);
    formData.set("phone", phone);
    if (useCustomPassword && customPassword) {
      formData.set("initialPassword", customPassword);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res: any = await createPartnerAction(null, formData);
    setResult(res);
    setLoading(false);
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  /* ═══════════════════════════════════════════════════════════════
     SUCCESS STATE
     ═══════════════════════════════════════════════════════════════ */
  if (result?.success) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        {/* Back link */}
        <Link
          href="/admin/partners"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors duration-150 mb-12"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Partners
        </Link>

        {/* Success Card */}
        <div className="surface p-12 text-center">
          {/* Success Icon */}
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 border border-emerald-100 mx-auto mb-8">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>

          <h1 className="text-[28px] font-bold tracking-[-0.03em] text-[var(--text-1)] mb-3">
            Partner Created
          </h1>
          <p className="text-[15px] text-[var(--text-3)] mb-12 max-w-md mx-auto leading-relaxed">
            Credentials generated successfully. Share these with the partner — the password won&apos;t be shown again.
          </p>

          {/* Credentials */}
          <div className="space-y-5 text-left max-w-md mx-auto">
            {/* Company ID */}
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-emerald-600">
                  Company ID
                </p>
                <button
                  onClick={() => copyToClipboard(result.companyId || "", "companyId")}
                  className="flex items-center gap-1.5 text-emerald-500 hover:text-emerald-700 transition-colors duration-150 btn-press"
                >
                  {copiedField === "companyId" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-[12px] font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span className="text-[12px] font-medium">Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p
                className="text-[28px] font-bold tracking-tight text-emerald-900"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {result.companyId}
              </p>
            </div>

            {/* Temporary Password */}
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-amber-600">
                  Temporary Password
                </p>
                <button
                  onClick={() => copyToClipboard(result.password || "", "password")}
                  className="flex items-center gap-1.5 text-amber-500 hover:text-amber-700 transition-colors duration-150 btn-press"
                >
                  {copiedField === "password" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-[12px] font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      <span className="text-[12px] font-medium">Copy</span>
                    </>
                  )}
                </button>
              </div>
              <p
                className="text-[28px] font-bold tracking-tight text-amber-900 break-all"
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {result.password}
              </p>
              <p className="mt-4 text-[13px] text-amber-600 leading-relaxed">
                This is the only time this password will be shown. The partner will be prompted to change it on first login.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-12 max-w-md mx-auto">
            <Button
              className="w-full h-[48px] text-[15px] font-semibold btn-press"
              onClick={() => router.push("/admin/partners")}
            >
              Go to Partner List
            </Button>
          </div>
        </div>
      </div>
    );
  }

  /* ═══════════════════════════════════════════════════════════════
     FORM STATE
     ═══════════════════════════════════════════════════════════════ */
  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      {/* Back link */}
      <Link
        href="/admin/partners"
        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-3)] hover:text-[var(--text-1)] transition-colors duration-150 mb-12"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Partners
      </Link>

      {/* Page Header */}
      <div className="mb-12">
        <h1 className="text-[32px] font-bold tracking-[-0.03em] text-[var(--text-1)] leading-tight">
          Create Partner
        </h1>
        <p className="mt-3 text-[15px] text-[var(--text-2)] max-w-md leading-relaxed">
          Add a new revenue partner to the platform. They&apos;ll receive login credentials after creation.
        </p>
      </div>

      {/* Form Card */}
      <div className="surface p-8 sm:p-10">
        <form onSubmit={handleSubmit} className="space-y-10">
          {result?.error && <FormError message={result.error} />}

          {/* Section: Partner Details */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-light)]">
                <User className="h-5 w-5 text-[var(--accent)]" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--text-1)]">
                  Partner Details
                </h2>
                <p className="text-[13px] text-[var(--text-3)] mt-0.5">
                  Basic information about the partner
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <Input
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="e.g., John Doe"
              />

              <div className="space-y-2">
                <label className="block text-[13px] font-semibold text-[var(--text-2)]">
                  Region
                </label>
                <select
                  value={regionId}
                  onChange={(e) => setRegionId(e.target.value)}
                  required
                  className="input-field text-[14px] h-[44px]"
                >
                  <option value="">Select a region</option>
                  {regions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Phone (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g., +1 555-0123"
              />
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-[var(--border-subtle)]" />

          {/* Section: Security */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50">
                <Shield className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-[15px] font-semibold text-[var(--text-1)]">
                  Security
                </h2>
                <p className="text-[13px] text-[var(--text-3)] mt-0.5">
                  Configure access credentials
                </p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="customPwd"
                  checked={useCustomPassword}
                  onChange={(e) => setUseCustomPassword(e.target.checked)}
                  className="lead-checkbox"
                />
                <label
                  htmlFor="customPwd"
                  className="text-[14px] text-[var(--text-2)]"
                >
                  Set a custom password (otherwise auto-generated)
                </label>
              </div>

              {useCustomPassword && (
                <Input
                  label="Initial Password"
                  type="password"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  minLength={8}
                  placeholder="Min 8 characters"
                  helpText="The partner should change this on first login."
                />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-4 pt-2">
            <Button
              type="submit"
              loading={loading}
              className="flex-1 h-[48px] text-[15px] font-semibold btn-press"
            >
              Create Partner
            </Button>
            <Link href="/admin/partners">
              <Button
                type="button"
                variant="secondary"
                className="h-[48px] px-8 text-[15px] btn-press"
              >
                Cancel
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
