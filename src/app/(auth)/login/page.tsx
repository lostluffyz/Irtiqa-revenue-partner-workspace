"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  signInWithCompanyId,
  signInWithEmail,
  isValidCompanyId,
} from "@/lib/auth";
import {
  onLoadingChange,
  setLoadingMessage,
} from "@/lib/loading-manager";
import { cn } from "@/lib/utils/cn";
import { Brand } from "@/components/ui/brand";
import { LoadingMessages } from "@/components/loading/loading-messages";
import Image from "next/image";
import {
  Building2,
  Lock,
  Eye,
  EyeOff,
  BarChart3,
  Shield,
  Mail,
  ArrowRight,
  Loader2,
  ShieldCheck,
  KeyRound,
  Zap,
  Users,
  Target,
} from "lucide-react";

type LoginMode = "partner" | "admin";
type Phase = "form" | "loading";

const FEATURES = [
  { icon: Users, label: "Lead Assignment" },
  { icon: Target, label: "Pipeline Visibility" },
  { icon: BarChart3, label: "Revenue Analytics" },
  { icon: Shield, label: "Secure Partner Management" },
];

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: "Enterprise Security" },
  { icon: KeyRound, label: "Role-Based Access" },
  { icon: Lock, label: "Encrypted Auth" },
  { icon: Zap, label: "Fast & Secure" },
];

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<LoginMode>("partner");
  const [companyId, setCompanyId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Phase controls the card content: form → loading
  const [phase, setPhase] = useState<Phase>("form");
  const [loadingMessage, setLoadingMsgState] = useState("Authenticating...");

  const passwordInputRef = useRef<HTMLInputElement>(null);
  const hasNavigatedRef = useRef(false);

  // Subscribe to loading manager for message rotation
  useEffect(() => {
    return onLoadingChange((s) => {
      if (phase === "loading") {
        setLoadingMsgState(s.message);
      }
    });
  }, [phase]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);

      if (mode === "partner") {
        const trimmedId = companyId.trim();
        if (!trimmedId) {
          setError("Please enter your Company ID.");
          return;
        }
        if (!isValidCompanyId(trimmedId)) {
          setError(
            "Invalid Company ID format. Use only letters, numbers, hyphens, and underscores.",
          );
          return;
        }
        if (!password) {
          setError("Please enter your password.");
          return;
        }
      } else {
        if (!email.trim()) {
          setError("Please enter your email.");
          return;
        }
        if (!password) {
          setError("Please enter your password.");
          return;
        }
      }

      setLoading(true);

      try {
        const { error: signInError } =
          mode === "partner"
            ? await signInWithCompanyId(supabase, companyId, password)
            : await signInWithEmail(supabase, email, password);

        if (signInError) {
          setError(
            signInError.message === "Invalid login credentials"
              ? "Invalid credentials. Please check your ID/password."
              : signInError.message,
          );
          setLoading(false);
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          setError("Authentication succeeded but could not load profile.");
          setLoading(false);
          return;
        }

        const { data: roleData } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();

        const profileRole = (roleData as { role: string } | null)?.role;

        if (profileRole === "admin" || profileRole === "partner") {
          // Auth complete — trigger the card morph
          // Start message rotation
          setLoadingMessage("Authenticating...");
          setPhase("loading");

          // Navigate after the card transition animation plays
          const target = profileRole === "admin" ? "/admin" : "/partner";
          setTimeout(() => {
            if (!hasNavigatedRef.current) {
              hasNavigatedRef.current = true;
              router.push(target);
            }
          }, 800);
        } else {
          setError("User profile not found. Contact your administrator.");
          setLoading(false);
        }
      } catch {
        setError("An unexpected error occurred. Please try again.");
        setLoading(false);
      }
    },
    [supabase, mode, companyId, email, password, router],
  );

  const switchMode = (newMode: LoginMode) => {
    setMode(newMode);
    setError(null);
  };

  const isLoaded = phase === "loading";

  return (
    <div className="flex min-h-screen bg-[var(--canvas)]">
      {/* ═══════════════════════════════════════════════════════════
          Left Brand Panel — Animated Background
          ═══════════════════════════════════════════════════════════ */}
      <div className={cn(
        "hidden w-1/2 lg:flex lg:flex-col lg:justify-between relative overflow-hidden bg-gradient-to-br from-[#0A0F1E] via-[#111827] to-[#0D1526] transition-opacity duration-500 ease-out",
        isLoaded && "opacity-60"
      )}>
        {/* Subtle dot grid overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #ffffff 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Floating gradient blobs */}
        <div className="login-blob-1 absolute top-[10%] left-[15%] w-[340px] h-[340px] rounded-full bg-[#1A56DB]/[0.07] blur-[100px]" />
        <div className="login-blob-2 absolute bottom-[20%] right-[10%] w-[280px] h-[280px] rounded-full bg-blue-400/[0.05] blur-[90px]" />
        <div className="login-blob-3 absolute top-[55%] left-[40%] w-[220px] h-[220px] rounded-full bg-indigo-500/[0.04] blur-[80px]" />

        {/* Soft radial glow — top accent */}
        <div className="absolute top-[-15%] left-[-8%] w-[50%] h-[50%] rounded-full bg-[var(--accent)]/[0.06] blur-[120px]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-12 xl:p-16">
          {/* Logo */}
          <div className="animate-fade-in">
            <Brand color="white" size="lg" />
          </div>

          {/* Headline & Features */}
          <div className="max-w-lg">
            <h1 className="text-[42px] xl:text-[46px] font-bold leading-[1.08] tracking-[-0.035em] text-white">
              Powering Modern
              <br />
              Revenue Teams.
            </h1>
            <p className="mt-5 text-[15px] leading-[1.7] text-white/35 max-w-md">
              Manage partners, track leads, monitor performance, and grow
              revenue — all from one secure workspace.
            </p>

            {/* Feature list */}
            <div className="mt-10 space-y-4">
              {FEATURES.map((feat, i) => (
                <div
                  key={feat.label}
                  className="flex items-center gap-3.5 text-[14px] text-white/50 group"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-center justify-center w-8 h-8 rounded-[10px] bg-white/[0.05] border border-white/[0.06] group-hover:bg-white/[0.08] group-hover:border-white/[0.1] transition-all duration-200">
                    <feat.icon className="w-4 h-4 text-white/35 group-hover:text-white/50 transition-colors duration-200" />
                  </div>
                  <span className="font-medium tracking-[-0.01em]">
                    {feat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer branding */}
          <p className="text-[12px] text-white/15 tracking-wide">
            &copy; {new Date().getFullYear()} Irtiqa Intelligence
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════
          Right Panel — Form or Loading Card
          ═══════════════════════════════════════════════════════════ */}
      <div className="flex w-full items-center justify-center px-5 py-8 md:px-6 md:py-12 lg:w-1/2 relative">
        {/* Subtle background pattern for right panel */}
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              "radial-gradient(circle, var(--text-1) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Soft ambient glow when loading */}
        {isLoaded && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[400px] h-[400px] rounded-full bg-[var(--accent)]/[0.02] blur-[80px] login-ambient-glow" />
          </div>
        )}

        <div className="w-full max-w-[420px] relative z-10">
          {/* Mobile brand */}
          <div className={cn(
            "mb-6 flex items-center justify-center lg:hidden animate-fade-in transition-opacity duration-300",
            isLoaded && "opacity-0 h-0 mb-0 overflow-hidden"
          )}>
            <Brand color="dark" size="lg" />
          </div>

          {/* ═══ Glass Card Container ═══ */}
          <div className={cn(
            "login-glass login-glass-mobile overflow-hidden animate-slide-up",
            isLoaded && "login-card-loading"
          )}>

            {/* ═══ FORM PHASE ═══ */}
            <div className={cn(
              "p-6 md:p-8 transition-all duration-300 ease-out",
              isLoaded && "login-form-exit login-form-exit-mobile"
            )}>
              {/* Welcome section */}
              <div className="mb-7">
                <h2 className="text-[24px] font-bold tracking-[-0.03em] text-[var(--text-1)] leading-tight">
                  Welcome Back
                </h2>
                <p className="mt-2 text-[14px] text-[var(--text-2)] leading-relaxed">
                  Sign in to access your Revenue Partner workspace.
                </p>
              </div>

              {/* ═══ Role Switcher — Pill Toggle ═══ */}
              <div className="relative mb-6 md:mb-7 flex rounded-full border border-[var(--border)] bg-[var(--canvas)]/80 p-1 login-segment-control">
                {/* Sliding indicator */}
                <div
                  className="login-segment-indicator absolute top-1 bottom-1 rounded-full bg-[var(--surface)] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]"
                  style={{
                    left: mode === "partner" ? "4px" : "calc(50%)",
                    width: "calc(50% - 4px)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => switchMode("partner")}
                  disabled={loading}
                  className={cn(
                    "relative z-10 flex-1 rounded-full px-4 py-2 text-[13px] font-medium transition-colors duration-200 login-segment-btn",
                    mode === "partner"
                      ? "text-[var(--text-1)]"
                      : "text-[var(--text-3)] hover:text-[var(--text-2)]",
                  )}
                >
                  Revenue Partner
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("admin")}
                  disabled={loading}
                  className={cn(
                    "relative z-10 flex-1 rounded-full px-4 py-2 text-[13px] font-medium transition-colors duration-200 login-segment-btn",
                    mode === "admin"
                      ? "text-[var(--text-1)]"
                      : "text-[var(--text-3)] hover:text-[var(--text-2)]",
                  )}
                >
                  Admin
                </button>
              </div>

              {/* ═══ Form ═══ */}
              <form onSubmit={handleSubmit} className="space-y-[14px] md:space-y-4">
                {/* Company ID / Email field */}
                {mode === "partner" ? (
                  <div className="space-y-1.5 login-field-stagger">
                    <label
                      htmlFor="companyId"
                      className="block text-[13px] font-medium text-[var(--text-2)]"
                    >
                      Company ID
                    </label>
                    <div className="relative login-input-wrap">
                      <Building2 className="login-input-icon absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)] pointer-events-none" />
                      <input
                        id="companyId"
                        type="text"
                        value={companyId}
                        onChange={(e) => setCompanyId(e.target.value)}
                        placeholder="e.g. RP-1001"
                        className="input-field-login scroll-margin-top-[80px]"
                        autoComplete="username"
                        disabled={loading}
                        autoFocus
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5 login-field-stagger">
                    <label
                      htmlFor="email"
                      className="block text-[13px] font-medium text-[var(--text-2)]"
                    >
                      Email
                    </label>
                    <div className="relative login-input-wrap">
                      <Mail className="login-input-icon absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)] pointer-events-none" />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        className="input-field-login scroll-margin-top-[80px]"
                        autoComplete="email"
                        disabled={loading}
                        autoFocus
                      />
                    </div>
                  </div>
                )}

                {/* Password field */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="password"
                    className="block text-[13px] font-medium text-[var(--text-2)]"
                  >
                    Password
                  </label>
                  <div className="relative login-input-wrap">
                    <Lock className="login-input-icon absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-3)] pointer-events-none" />
                    <input
                      ref={passwordInputRef}
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="input-field-login pr-11 scroll-margin-top-[80px]"
                      autoComplete="current-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowPassword(!showPassword);
                        setTimeout(() => passwordInputRef.current?.focus(), 0);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-[var(--text-3)] hover:text-[var(--text-2)] transition-colors duration-150 login-pw-toggle"
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <div
                    className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-[#FEF2F2] px-4 py-3 text-[13px] text-[var(--status-danger)] animate-slide-up"
                    role="alert"
                  >
                    <svg
                      className="mt-0.5 h-4 w-4 shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                      />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="login-button mt-2 min-h-[48px] md:min-h-0"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing in...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      {mode === "partner"
                        ? "Sign In with Company ID"
                        : "Sign In as Admin"}
                      <ArrowRight className="login-arrow h-4 w-4" />
                    </span>
                  )}
                </button>
              </form>

              {/* Trust section */}
              <div className="mt-5 pt-4 md:mt-7 md:pt-5 border-t border-[var(--border-subtle)]">
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 md:gap-x-4 md:gap-y-2.5">
                  {TRUST_ITEMS.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 text-[11.5px] text-[var(--text-3)]"
                    >
                      <item.icon className="w-3.5 h-3.5 shrink-0 opacity-60" />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ═══ LOADING PHASE — Replaces form content ═══ */}
            {isLoaded && (
              <div className="login-loading-enter login-loading-overlay absolute inset-0 flex flex-col items-center justify-center p-8">
                {/* Logo with glow */}
                <div className="relative">
                  <div className="absolute -inset-3 rounded-full bg-[var(--accent)]/[0.04] blur-[12px] login-loading-glow" aria-hidden="true" />
                  <div className="relative">
                    <Image
                      src="/irtiqa-logo-transparent.png"
                      alt="Irtiqa AI"
                      width={44}
                      height={44}
                      className="h-[44px] w-auto login-loading-logo"
                      unoptimized
                      priority
                    />
                  </div>
                </div>

                {/* Product name */}
                <h2 className="mt-8 text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-1)] login-loading-text">
                  Revenue Partner
                </h2>

                {/* Status message */}
                <div className="mt-6 h-[18px] flex items-center justify-center" aria-live="polite" aria-atomic="true">
                  <LoadingMessages message={loadingMessage} />
                </div>

                {/* Progress bar below status */}
                <div className="mt-6 w-[200px] h-[2px] bg-[var(--border-subtle)]/30 rounded-full overflow-hidden">
                  <div className="login-card-progress-bar" />
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={cn(
            "hidden md:block mt-6 text-center transition-opacity duration-300",
            isLoaded && "opacity-0"
          )}>
            <p className="text-[11px] text-[var(--text-3)]/50">
              &copy; {new Date().getFullYear()} Irtiqa Intelligence &middot;{" "}
              <span className="opacity-70">Version 1.0</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
