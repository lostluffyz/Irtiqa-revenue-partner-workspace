-- ============================================
-- Revenue Partner Workspace — Program Start Date
-- Supabase Migration 004
-- 2026-07-13
-- ============================================
--
-- Phase 3: Adds program_start_date to partners table
-- for program day calculation, streak tracking, and
-- partner progress metrics.
--
-- Changes:
-- 1. ADD program_start_date DATE column
-- 2. Backfill with created_at for existing partners
-- 3. Make NOT NULL for future records

-- ============================================
-- 1. Add program_start_date column
-- ============================================
ALTER TABLE public.partners
ADD COLUMN IF NOT EXISTS program_start_date DATE;

-- ============================================
-- 2. Backfill for existing partners
-- ============================================
UPDATE public.partners
SET program_start_date = created_at::DATE
WHERE program_start_date IS NULL;

-- ============================================
-- 3. Make NOT NULL
-- ============================================
ALTER TABLE public.partners
ALTER COLUMN program_start_date SET NOT NULL;
