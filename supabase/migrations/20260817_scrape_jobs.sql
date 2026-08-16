-- ============================================
-- Revenue Partner Workspace — Google Maps Scraper Integration
-- Supabase Migration 20260817
-- ============================================
--
-- NON-DESTRUCTIVE, ADDITIVE-ONLY.
-- This migration does NOT delete, truncate, reassign, or reset ANY
-- existing rows. Existing partners and all existing leads are
-- left completely intact.
--
-- Changes:
--   1. Add google_place_id column to leads (for Google Maps dedup)
--   2. Add source column to leads (for lead origin tracking)
--   3. Create scrape_jobs table (job lifecycle tracking)
-- ============================================

-- ============================================
-- 1. LEADS — google_place_id column (additive)
-- ============================================
-- Dedicated field for Google Maps place identifier.
-- Used as PRIMARY deduplication key for Google Maps leads.
-- NULL for all existing leads (no data loss, no breakage).
-- Partial unique index: only enforces uniqueness for non-null values,
-- so existing NULL rows are unaffected.

ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS google_place_id TEXT;

COMMENT ON COLUMN public.leads.google_place_id IS
    'Google Maps unique place identifier. Used as primary dedup key for Google Maps leads. NULL for non-Google-Maps leads.';

-- Partial unique index: prevents duplicate Google Maps leads
-- but allows unlimited NULLs (existing leads).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_leads_google_place_id
    ON public.leads (google_place_id)
    WHERE google_place_id IS NOT NULL;

-- ============================================
-- 2. LEADS — source column (additive)
-- ============================================
-- Tracks lead origin: 'csv', 'google_maps', 'manual', etc.
-- NULL for existing leads (backward compatible).

ALTER TABLE public.leads
    ADD COLUMN IF NOT EXISTS source TEXT;

COMMENT ON COLUMN public.leads.source IS
    'Lead origin tracking: csv, google_maps, manual, etc. NULL for pre-existing leads.';

CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);

-- ============================================
-- 3. SCRAPE JOBS — job lifecycle tracking
-- ============================================
-- Tracks Google Maps scrape jobs initiated by admins.
-- scrape_job_id (id) is the stable canonical identifier between
-- Vercel, GitHub Actions, and Supabase.

CREATE TABLE IF NOT EXISTS public.scrape_jobs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
                            'pending', 'running', 'completed', 'partial', 'failed', 'cancelled'
                        )),
    query               TEXT NOT NULL,
    location            TEXT NOT NULL,
    requested_count     INTEGER NOT NULL CHECK (requested_count > 0),
    extract_emails      BOOLEAN NOT NULL DEFAULT false,
    dry_run             BOOLEAN NOT NULL DEFAULT true,
    scraped_count       INTEGER NOT NULL DEFAULT 0,
    valid_count         INTEGER NOT NULL DEFAULT 0,
    inserted_count      INTEGER NOT NULL DEFAULT 0,
    duplicate_count     INTEGER NOT NULL DEFAULT 0,
    skipped_count       INTEGER NOT NULL DEFAULT 0,
    error_count         INTEGER NOT NULL DEFAULT 0,
    workflow_run_id     TEXT,
    created_by          UUID NOT NULL REFERENCES public.profiles(id),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    error_message       TEXT
);

COMMENT ON TABLE public.scrape_jobs IS
    'Google Maps scrape job lifecycle. scrape_job_id (id) is the canonical identifier between Vercel and GitHub Actions.';

CREATE INDEX IF NOT EXISTS idx_scrape_jobs_status ON public.scrape_jobs(status);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_created ON public.scrape_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_jobs_created_by ON public.scrape_jobs(created_by);

-- RLS: only admins can see/manage scrape jobs
ALTER TABLE public.scrape_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scrape_jobs_select_admin" ON public.scrape_jobs
    FOR SELECT USING (is_admin());

CREATE POLICY "scrape_jobs_insert_admin" ON public.scrape_jobs
    FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "scrape_jobs_update_admin" ON public.scrape_jobs
    FOR UPDATE USING (is_admin())
    WITH CHECK (is_admin());

-- GRANTs for service_role (used by GitHub Actions ingestion)
GRANT SELECT, INSERT, UPDATE ON public.scrape_jobs TO authenticated, service_role;
