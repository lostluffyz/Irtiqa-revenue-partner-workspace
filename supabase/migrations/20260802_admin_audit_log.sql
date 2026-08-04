-- ============================================
-- Migration: Admin Audit Log
-- ============================================
--
-- Creates an immutable audit log for privileged admin actions.
-- This table is INDEPENDENT of partner lifecycle — records survive
-- partner deletion because there is no FK to partners.
--
-- Purpose: Track who deleted what, when, and whether it succeeded.
-- Access:  Admin-only (RLS policies enforce is_admin()).
--
-- ============================================

-- ── Table ──

CREATE TABLE public.admin_audit_log (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id    UUID NOT NULL REFERENCES public.profiles(id),
  admin_email TEXT NOT NULL,
  action      TEXT NOT NULL,
  target_id   UUID,                          -- NOT a FK — survives partner deletion
  target_name TEXT,                          -- denormalized — survives deletion
  target_meta JSONB,                         -- { companyId, region, status, ... }
  result      TEXT NOT NULL DEFAULT 'success', -- 'success' or 'error'
  error_msg   TEXT,                          -- sanitized error message
  duration_ms INTEGER,                       -- wall-clock duration
  created_at  TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- ── Indexes ──

CREATE INDEX idx_audit_admin ON public.admin_audit_log (admin_id, created_at DESC);
CREATE INDEX idx_audit_target ON public.admin_audit_log (target_id);
CREATE INDEX idx_audit_action ON public.admin_audit_log (action);

-- ── Row Level Security ──

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins can read all audit entries
CREATE POLICY "audit_select_admin" ON public.admin_audit_log
  FOR SELECT USING (is_admin());

-- Admins can insert audit entries (append-only)
CREATE POLICY "audit_insert_admin" ON public.admin_audit_log
  FOR INSERT WITH CHECK (is_admin());

-- No UPDATE or DELETE policies — this table is immutable by design.
