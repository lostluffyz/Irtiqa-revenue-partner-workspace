-- ============================================
-- Migration 007: Fix Resource RLS Policies
-- ============================================
--
-- The previous resources_select_partner policy allowed
-- ANY user (including unauthenticated/anonymous) to read
-- active resources by only checking is_active = true.
--
-- This migration adds an authentication requirement so
-- only authenticated users (partners + admins) can read
-- resources, matching the security posture of announcements.
-- ============================================

-- Drop the overly-permissive policy
DROP POLICY IF EXISTS "resources_select_partner" ON public.resources;

-- Recreate with authentication check
CREATE POLICY "resources_select_partner" ON public.resources FOR SELECT
    USING (auth.role() = 'authenticated' AND is_active = true);
