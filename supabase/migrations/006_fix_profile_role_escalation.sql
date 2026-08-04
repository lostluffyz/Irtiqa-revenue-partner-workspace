-- ============================================
-- Migration 006: Fix profile role escalation
-- ============================================
--
-- Problem: The profiles_update_own RLS policy allows partners to
-- update ANY column on their own profile, including `role`. This
-- means a partner can escalate to admin by setting role='admin'.
--
-- Fix: The WITH CHECK now ensures the role column is unchanged
-- by comparing it against the existing row's role value.
--
-- Applied:  2026-07-13
-- ============================================

-- Drop the vulnerable policy
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Recreate with role protection: the new row's role must equal the old row's role
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- Verify: this policy still allows admin to update any profile (including role)
-- via the existing profiles_update_admin policy (USING is_admin(), WITH CHECK is_admin())
-- which takes precedence due to permissive policy combination.
