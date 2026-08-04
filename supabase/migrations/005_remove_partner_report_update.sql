-- ============================================
-- Revenue Partner Workspace — Remove Partner Report UPDATE
-- Supabase Migration 005
-- 2026-07-13
-- ============================================
--
-- PRD requires: ONE REPORT PER DAY. ONE SUBMISSION ONLY.
--
-- The UNIQUE(partner_id, report_date) constraint prevents
-- duplicate INSERTs. However, migration 002 left a partner
-- UPDATE policy (reports_update_partner) that allowed partners
-- to modify today's submitted report.
--
-- This migration removes partner UPDATE access entirely.
-- Once a report is submitted, the partner cannot modify it.
-- Admin retains full access via admin RLS.
--
-- Changes:
-- 1. DROP reports_update_partner policy (partners can no longer UPDATE)
-- 2. Admin UPDATE is unaffected (managed via reports_select_admin
--    pattern — admin bypasses row-level checks)

-- ============================================
-- 1. Remove partner UPDATE capability
-- ============================================
DROP POLICY IF EXISTS "reports_update_partner" ON public.daily_reports;

-- ============================================
-- 2. Add admin UPDATE policy (for admin corrections)
-- ============================================
-- Admin UPDATE is covered by is_admin() — create explicit policy
-- for clarity and to match the pattern used by leads/partners.
DROP POLICY IF EXISTS "reports_update_admin" ON public.daily_reports;
CREATE POLICY "reports_update_admin" ON public.daily_reports FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());
