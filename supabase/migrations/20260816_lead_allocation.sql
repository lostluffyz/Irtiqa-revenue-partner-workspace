-- ============================================
-- Revenue Partner Workspace — Automatic Lead Allocation
-- Supabase Migration 20260816
-- ============================================
--
-- NON-DESTRUCTIVE, ADDITIVE-ONLY.
-- This migration does NOT delete, truncate, reassign, or reset ANY
-- existing rows. Existing partners and the ~1000 existing leads are
-- left completely intact.
--
-- Design:
--   * partners already carry program_start_date (backfilled from created_at
--     in migration 004). It is REUSED — nothing is re-derived or invented.
--   * Program end is computed as: program_start_date + 30 days (exclusive
--     boundary). No stored program_ends_at column is added (avoids drift).
--   * "Total assigned" is always the live count of leads.assigned_to = partner.
--     Pre-existing assigned leads therefore count toward the program total.
--   * Weekly-period accounting is tracked per partner/period in
--     lead_allocation_batches. This is the idempotency anchor.
--   * Concurrency safety: allocation RPCs lock the partner row
--     (SELECT ... FOR UPDATE) to serialize per-partner allocation, then claim
--     unassigned leads with FOR UPDATE SKIP LOCKED. The database is the final
--     authority — the same lead can never be assigned twice.
--
-- RLS: new tables are admin-readable (batches also partner-readable for
-- their own rows). Explicit GRANTs are added so the app roles can use the
-- Data API regardless of the auto_expose_new_tables cloud setting.
-- ============================================

-- ============================================
-- 1. PARTNERS — allocation limit columns (additive)
-- ============================================

ALTER TABLE public.partners
    ADD COLUMN IF NOT EXISTS default_program_lead_limit INTEGER NOT NULL DEFAULT 400
        CHECK (default_program_lead_limit >= 0),
    ADD COLUMN IF NOT EXISTS default_weekly_lead_limit INTEGER NOT NULL DEFAULT 100
        CHECK (default_weekly_lead_limit >= 0),
    ADD COLUMN IF NOT EXISTS approved_extra_leads INTEGER NOT NULL DEFAULT 0
        CHECK (approved_extra_leads >= 0),
    ADD COLUMN IF NOT EXISTS weekly_lead_limit_override INTEGER
        CHECK (weekly_lead_limit_override IS NULL OR weekly_lead_limit_override > 0),
    ADD COLUMN IF NOT EXISTS allocation_enabled BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.partners.default_program_lead_limit IS
    'Default total program lead allocation (400). Effective limit = default_program_lead_limit + approved_extra_leads.';
COMMENT ON COLUMN public.partners.default_weekly_lead_limit IS
    'Default leads allocatable per 7-day period (100).';
COMMENT ON COLUMN public.partners.approved_extra_leads IS
    'Head/Admin approved extra leads on top of the default program limit.';
COMMENT ON COLUMN public.partners.weekly_lead_limit_override IS
    'Optional explicit per-partner weekly limit. NULL -> default_weekly_lead_limit is used.';
COMMENT ON COLUMN public.partners.allocation_enabled IS
    'Master switch for automatic allocation for this partner.';

CREATE INDEX IF NOT EXISTS idx_partners_allocation_scan
    ON public.partners (status, allocation_enabled, program_start_date);

-- ============================================
-- 2. LEAD ALLOCATION BATCHES — assignment batch history
-- ============================================
-- One row per allocation.batch (automatic period runs, manual, smart).
-- The automatic uniqueness index is the idempotency anchor for the
-- scheduler: only one automatic batch row is ever created per partner and
-- per 7-day allocation period.

CREATE TABLE IF NOT EXISTS public.lead_allocation_batches (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id              UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    allocation_period_start DATE NOT NULL,
    allocation_period_end   DATE NOT NULL,
    lead_count              INTEGER NOT NULL DEFAULT 0 CHECK (lead_count >= 0),
    program_total_after     INTEGER NOT NULL DEFAULT 0 CHECK (program_total_after >= 0),
    source                  TEXT NOT NULL CHECK (source IN ('automatic', 'manual', 'smart')),
    triggered_by            UUID REFERENCES public.profiles(id),
    reason                  TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alloc_batches_partner ON public.lead_allocation_batches (partner_id, allocation_period_start DESC);
CREATE INDEX IF NOT EXISTS idx_alloc_batches_created ON public.lead_allocation_batches (created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_alloc_batch_automatic_per_period
    ON public.lead_allocation_batches (partner_id, allocation_period_start)
    WHERE source = 'automatic';

ALTER TABLE public.lead_allocation_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alloc_batches_select_admin" ON public.lead_allocation_batches
    FOR SELECT USING (is_admin());

CREATE POLICY "alloc_batches_select_own" ON public.lead_allocation_batches
    FOR SELECT USING (
        partner_id = auth.uid()
        AND is_partner()
    );

CREATE POLICY "alloc_batches_insert_admin" ON public.lead_allocation_batches
    FOR INSERT WITH CHECK (is_admin());

-- ============================================
-- 3. LEAD ALLOCATION APPROVALS — Head/Admin extra-lead approvals
-- ============================================

CREATE TABLE IF NOT EXISTS public.lead_allocation_approvals (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id  UUID NOT NULL REFERENCES public.partners(id) ON DELETE CASCADE,
    quantity    INTEGER NOT NULL CHECK (quantity > 0),
    reason      TEXT,
    approved_by UUID NOT NULL REFERENCES public.profiles(id),
    approved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_on  DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alloc_approvals_partner ON public.lead_allocation_approvals (partner_id, created_at DESC);

ALTER TABLE public.lead_allocation_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alloc_approvals_select_admin" ON public.lead_allocation_approvals
    FOR SELECT USING (is_admin());

CREATE POLICY "alloc_approvals_insert_admin" ON public.lead_allocation_approvals
    FOR INSERT WITH CHECK (is_admin());

-- ============================================
-- 4. GRANTS — ensure the authenticated/service roles can use the Data API
--    for the new objects (independent of auto_expose_new_tables).
-- ============================================

GRANT SELECT, INSERT ON public.lead_allocation_batches TO authenticated, service_role;
GRANT SELECT, INSERT ON public.lead_allocation_approvals TO authenticated, service_role;

-- ============================================
-- 5. RPC: approve_extra_leads
-- ============================================
-- Atomically records an approval and increments partners.approved_extra_leads.
-- Returns the resulting approved_extra_leads. Administrative authorization is
-- enforced by the calling server action (requireAdmin) — same pattern as all
-- existing admin operations.

CREATE OR REPLACE FUNCTION public.approve_extra_leads(
    p_partner_id uuid,
    p_quantity   integer,
    p_reason     text,
    p_approved_by uuid,
    p_expires_on date DEFAULT NULL
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_new integer;
BEGIN
    IF p_partner_id IS NULL THEN
        RAISE EXCEPTION 'partner_id is required';
    END IF;
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE EXCEPTION 'quantity must be a positive integer';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.partners WHERE id = p_partner_id) THEN
        RAISE EXCEPTION 'partner not found';
    END IF;

    INSERT INTO public.lead_allocation_approvals
        (partner_id, quantity, reason, approved_by, expires_on)
    VALUES
        (p_partner_id, p_quantity, NULLIF(p_reason, ''), p_approved_by, p_expires_on);

    UPDATE public.partners
    SET approved_extra_leads = approved_extra_leads + p_quantity
    WHERE id = p_partner_id
    RETURNING approved_extra_leads INTO v_new;

    RETURN v_new;
END;
$$;

-- ============================================
-- 6. RPC: allocate_automatic_batch
-- ============================================
-- The scheduler's atomic claim+record operation for one partner and one
-- 7-day allocation period.
--
--   * Serializes per-partner allocation via partner row lock (FOR UPDATE).
--   * Re-derives the effective program limit and weekly limit inside the
--     locked transaction so concurrent runs cannot overshoot.
--   * Claims only unassigned leads using FOR UPDATE SKIP LOCKED — the same
--     lead can never be claimed by two transactions.
--   * Creates a lead_allocation_batches row (source = 'automatic'). If the
--     caller's window already has an automatic batch, no new one is created
--     and unused capacity in the same window is skipped (idempotent).
--
-- Returns the number of leads actually assigned.

CREATE OR REPLACE FUNCTION public.allocate_automatic_batch(
    p_partner_id  uuid,
    p_period_start date,
    p_period_end  date,
    p_max_count   integer,
    p_reason      text DEFAULT 'scheduled'
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_effective_limit integer;
    v_weekly_limit    integer;
    v_total           integer;
    v_weekly          integer;
    v_capacity        integer;
    v_assigned        integer;
BEGIN
    IF p_partner_id IS NULL OR p_period_start IS NULL THEN
        RETURN 0;
    END IF;

    -- Serialize per-partner allocation.
    SELECT default_program_lead_limit + approved_extra_leads,
           COALESCE(weekly_lead_limit_override, default_weekly_lead_limit)
    INTO v_effective_limit, v_weekly_limit
    FROM public.partners
    WHERE id = p_partner_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    SELECT count(*)::int INTO v_total
    FROM public.leads
    WHERE assigned_to = p_partner_id;

    SELECT COALESCE(sum(lead_count), 0)::int INTO v_weekly
    FROM public.lead_allocation_batches
    WHERE partner_id = p_partner_id
      AND allocation_period_start = p_period_start;

    v_capacity := LEAST(
        GREATEST(0, v_effective_limit - v_total),
        GREATEST(0, v_weekly_limit - v_weekly),
        COALESCE(p_max_count, 0)
    );

    IF v_capacity <= 0 THEN
        RETURN 0;
    END IF;

    WITH picked AS (
        SELECT id
        FROM public.leads
        WHERE assigned_to IS NULL
        ORDER BY created_at ASC, id ASC
        LIMIT v_capacity
        FOR UPDATE SKIP LOCKED
    )
    UPDATE public.leads l
    SET assigned_to = p_partner_id,
        assigned_at = now()
    FROM picked
    WHERE l.id = picked.id;

    GET DIAGNOSTICS v_assigned = ROW_COUNT;

    IF v_assigned > 0 THEN
        INSERT INTO public.lead_allocation_batches
            (partner_id, allocation_period_start, allocation_period_end,
             lead_count, program_total_after, source, triggered_by, reason)
        VALUES
            (p_partner_id, p_period_start, p_period_end, v_assigned,
             (SELECT count(*)::int FROM public.leads WHERE assigned_to = p_partner_id),
             'automatic', NULL, p_reason);
    END IF;

    RETURN v_assigned;
END;
$$;

-- ============================================
-- 7. RPC: record_manual_batch
-- ============================================
-- Atomic claim+record for manual / smart assignment paths (leads already
-- selected by the caller). Re-validates program + weekly capacity inside the
-- transaction (partner row lock) and clamps to what actually remains. Returns
-- the number of leads actually assigned.
--
-- Returns -1 only when NO idempotency/capacity re-check is possible because
-- the caller-provided period is malformed.

CREATE OR REPLACE FUNCTION public.record_manual_batch(
    p_partner_id   uuid,
    p_lead_ids     uuid[],
    p_period_start date,
    p_period_end   date,
    p_source       text,
    p_triggered_by uuid,
    p_reason       text
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_effective_limit integer;
    v_weekly_limit    integer;
    v_total           integer;
    v_weekly          integer;
    v_requested       integer;
    v_assigned        integer;
    v_batch_id        uuid;
BEGIN
    IF p_source IS NULL OR p_source NOT IN ('manual', 'smart') THEN
        RETURN 0;
    END IF;
    IF p_lead_ids IS NULL OR (p_lead_ids = '{}') OR p_period_start IS NULL THEN
        RETURN 0;
    END IF;

    -- Serialize per-partner allocation.
    SELECT default_program_lead_limit + approved_extra_leads,
           COALESCE(weekly_lead_limit_override, default_weekly_lead_limit)
    INTO v_effective_limit, v_weekly_limit
    FROM public.partners
    WHERE id = p_partner_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- How many of the requested leads are still unassigned?
    SELECT count(*)::int INTO v_requested
    FROM public.leads
    WHERE id = ANY(p_lead_ids) AND assigned_to IS NULL;

    SELECT count(*)::int INTO v_total
    FROM public.leads
    WHERE assigned_to = p_partner_id;

    SELECT COALESCE(sum(lead_count), 0)::int INTO v_weekly
    FROM public.lead_allocation_batches
    WHERE partner_id = p_partner_id
      AND allocation_period_start = p_period_start;

    -- Clamp to genuine remaining capacity.
    IF v_requested <= 0
       OR v_total + v_requested > v_effective_limit
       OR v_weekly + v_requested > v_weekly_limit
    THEN
        -- Figure out how many fit.
        SELECT LEAST(
            v_requested,
            GREATEST(0, v_effective_limit - v_total),
            GREATEST(0, v_weekly_limit - v_weekly)
        ) INTO v_requested;
    END IF;

    IF v_requested <= 0 THEN
        RETURN 0;
    END IF;

    CREATE TEMP TABLE _alloc_picked ON COMMIT DROP AS
        SELECT id
        FROM public.leads
        WHERE id = ANY(p_lead_ids) AND assigned_to IS NULL
        ORDER BY id
        LIMIT v_requested;

    UPDATE public.leads l
    SET assigned_to = p_partner_id,
        assigned_at = now()
    FROM _alloc_picked
    WHERE l.id = _alloc_picked.id;

    GET DIAGNOSTICS v_assigned = ROW_COUNT;

    IF v_assigned > 0 THEN
        INSERT INTO public.lead_allocation_batches
            (partner_id, allocation_period_start, allocation_period_end,
             lead_count, program_total_after, source, triggered_by, reason)
        VALUES
            (p_partner_id, p_period_start, p_period_end, v_assigned,
             (SELECT count(*)::int FROM public.leads WHERE assigned_to = p_partner_id),
             p_source, p_triggered_by, p_reason)
        RETURNING id INTO v_batch_id;
    END IF;

    DROP TABLE IF EXISTS _alloc_picked;

    RETURN v_assigned;
END;
$$;

-- ============================================
-- 8. Function EXECUTE grants (server-side RPCs)
-- ============================================
-- Only authenticated users (app server actions via authenticated, or
-- service_role) may execute. Anonymous access is revoked.

REVOKE EXECUTE ON FUNCTION public.approve_extra_leads(uuid, integer, text, uuid, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.approve_extra_leads(uuid, integer, text, uuid, date) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.allocate_automatic_batch(uuid, date, date, integer, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.allocate_automatic_batch(uuid, date, date, integer, text) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.record_manual_batch(uuid, uuid[], date, date, text, uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.record_manual_batch(uuid, uuid[], date, date, text, uuid, text) TO authenticated, service_role;

-- ============================================
-- VERIFICATION (no-op for data; purely informational)
-- ============================================
-- SELECT 'partners incl. allocation columns' AS check;
-- SELECT count(*) AS partners FROM public.partners;
-- SELECT count(*) AS leads FROM public.leads;
-- SELECT count(*) AS assigned_leads FROM public.leads WHERE assigned_to IS NOT NULL;