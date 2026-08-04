"use client";

import {
  useState,
  useCallback,
  createContext,
  useContext,
  useEffect,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";
import { TOAST_ENTER, TOAST_EXIT, REDUCED_MOTION_TRANSITION } from "@/lib/animations";

/* ═══════════════════════════════════════════════════════════════
   Toast — Minimal notification system with motion animations
   ═══════════════════════════════════════════════════════════════ */

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant: "success" | "error" | "info";
}

interface ToastContextValue {
  toast: (t: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { ...t, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="toast-container" aria-live="polite">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const prefersReduced = useReducedMotion();

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const Icon =
    toast.variant === "success"
      ? CheckCircle
      : toast.variant === "error"
      ? XCircle
      : Info;

  const enterTransition = prefersReduced ? REDUCED_MOTION_TRANSITION : TOAST_ENTER.transition;
  const exitTransition = prefersReduced ? REDUCED_MOTION_TRANSITION : TOAST_EXIT.transition;

  return (
    <motion.div
      className={`toast toast-${toast.variant}`}
      initial={TOAST_ENTER.initial}
      animate={TOAST_ENTER.animate}
      exit={TOAST_EXIT.exit}
      transition={{ ...enterTransition, ...exitTransition }}
      layout
    >
      <span className="toast-icon">
        <Icon className="h-4 w-4" />
      </span>
      <div className="toast-body">
        <p className="toast-title">{toast.title}</p>
        {toast.description && (
          <p className="toast-description">{toast.description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 p-1 rounded-[var(--radius-sm)] text-[var(--text-3)] hover:text-[var(--text-1)] hover:bg-[var(--hover-bg)] transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}
