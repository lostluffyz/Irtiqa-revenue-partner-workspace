"use client";

import { useEffect, useRef, useCallback, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import {
  DIALOG_OVERLAY,
  DIALOG_PANEL,
  REDUCED_MOTION_TRANSITION,
} from "@/lib/animations";

/* ═══════════════════════════════════════════════════════════════
   Dialog — Modal overlay with focus trap + motion animations
   ═══════════════════════════════════════════════════════════════ */

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const prefersReduced = useReducedMotion();

  const handleClose = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, handleClose]);

  // Body scroll lock
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Focus trap
  useEffect(() => {
    if (!open) return;
    const el = overlayRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) focusable[0].focus();
  }, [open]);

  const overlayTransition = prefersReduced ? REDUCED_MOTION_TRANSITION : DIALOG_OVERLAY.transition;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={overlayRef}
          className="dialog-overlay"
          initial={DIALOG_OVERLAY.initial}
          animate={DIALOG_OVERLAY.animate}
          exit={DIALOG_OVERLAY.exit}
          transition={overlayTransition}
          onClick={(e) => {
            if (e.target === e.currentTarget) handleClose();
          }}
          role="dialog"
          aria-modal="true"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ═══════════════════════════════════════════════════════════════
   DialogContent — Centered panel with motion animation
   ═══════════════════════════════════════════════════════════════ */

export function DialogContent({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      className={`dialog-content ${className}`}
      initial={DIALOG_PANEL.initial}
      animate={DIALOG_PANEL.animate}
      exit={DIALOG_PANEL.exit}
      transition={prefersReduced ? REDUCED_MOTION_TRANSITION : DIALOG_PANEL.transition}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DialogHeader — Title + description
   ═══════════════════════════════════════════════════════════════ */

export function DialogHeader({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`dialog-header ${className}`}>
      {children}
    </div>
  );
}

export function DialogTitle({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2 className={`dialog-title ${className}`}>
      {children}
    </h2>
  );
}

export function DialogDescription({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`dialog-description ${className}`}>
      {children}
    </p>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DialogFooter — Actions
   ═══════════════════════════════════════════════════════════════ */

export function DialogFooter({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`dialog-footer ${className}`}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DialogClose — Close button (X)
   ═══════════════════════════════════════════════════════════════ */

export function DialogClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="dialog-close"
      aria-label="Close"
    >
      <X className="h-4 w-4" />
    </button>
  );
}
