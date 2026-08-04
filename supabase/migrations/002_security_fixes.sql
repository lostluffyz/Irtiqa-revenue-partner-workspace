-- ============================================
-- Revenue Partner Workspace — Security Fixes
-- Supabase Migration 002
-- 2026-07-13
-- ============================================
--
-- AUDIT FINDINGS:
--
-- CRITICAL: Partners could UPDATE non-status columns on leads
--   No column-level restriction existed. A partner could call the
--   Supabase API directly and modify internal_notes, company_name,
--   email, phone, website, industry, country on leads assigned to them.
--
--   FIX: BEFORE UPDATE trigger on leads rejects non-status column
--   modifications when the current user is a partner.
--
-- MEDIUM: leads_update_partner_status policy didn't check partners.status
--   The UPDATE policy used is_partner() (which checks profiles.is_active)
--   but did NOT verify partners.status = 'active'. The SELECT policy
--   already had this check; UPDATE was inconsistent.
--
--   FIX: Added partners.status = 'active' check to UPDATE policy.
--
-- MEDIUM: Missing INSERT policies on audit tables
--   partner_activity_log and lead_status_history had SELECT policies
--   only. Application server actions (running as authenticated user)
--   could not insert rows.
--
--   FIX: Added INSERT policies with appropriate ownership checks.
--
-- LOW: daily_reports partner UPDATE allowed editing historical reports
--   Partners could update any of their past reports, not just today's.
--
--   FIX: Restrict partner UPDATE to report_date = CURRENT_DATE.
--
-- LOW: partner_activity_log missing DELETE/UPDATE policies
--   ACCEPTED: Activity log is append-only. No DELETE or UPDATE needed.
--   Future rotation should happen via admin service_role scripts.
-- ============================================

-- ============================================
-- FIX 1: Prevent partners from modifying non-status lead columns
-- ============================================
CREATE OR REPLACE FUNCTION public.check_lead_partner_update()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role text;
BEGIN
    -- Get the current user's role
    SELECT role INTO v_role
    FROM public.profiles
    WHERE id = auth.uid();

    -- Only enforce restrictions for partners
    IF v_role = 'partner' THEN
        IF OLD.company_name IS DISTINCT FROM NEW.company_name
            OR OLD.website IS DISTINCT FROM NEW.website
            OR OLD.phone IS DISTINCT FROM NEW.phone
            OR OLD.email IS DISTINCT FROM NEW.email
            OR OLD.industry IS DISTINCT FROM NEW.industry
            OR OLD.country IS DISTINCT FROM NEW.country
            OR OLD.internal_notes IS DISTINCT FROM NEW.internal_notes
            OR OLD.created_by IS DISTINCT FROM NEW.created_by
            OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to
            OR OLD.assigned_at IS DISTINCT FROM NEW.assigned_at
            OR OLD.created_at IS DISTINCT FROM NEW.created_at
        THEN
            RAISE EXCEPTION 'Partners may only update the status field on leads. Use the API to change other fields.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_lead_partner_update
    BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.check_lead_partner_update();

COMMENT ON FUNCTION public.check_lead_partner_update() IS
    'Security: prevents partner users from modifying lead columns other than status. Admin users bypass this check.';


-- ============================================
-- FIX 2: Strengthen leads_update_partner_status with partners.status check
-- ============================================
DROP POLICY IF EXISTS "leads_update_partner_status" ON public.leads;

CREATE POLICY "leads_update_partner_status" ON public.leads FOR UPDATE
    USING (
        assigned_to = auth.uid()
        AND is_partner()
        AND EXISTS (
            SELECT 1 FROM public.partners
            WHERE id = auth.uid() AND status = 'active'
        )
    )
    WITH CHECK (
        assigned_to = auth.uid()
        AND is_partner()
        AND EXISTS (
            SELECT 1 FROM public.partners
            WHERE id = auth.uid() AND status = 'active'
        )
    );


-- ============================================
-- FIX 3: Add INSERT policies for audit tables
-- ============================================

-- partner_activity_log: partners insert own, admin inserts any
DROP POLICY IF EXISTS "activity_insert" ON public.partner_activity_log;
CREATE POLICY "activity_insert_partner" ON public.partner_activity_log FOR INSERT
    WITH CHECK (
        partner_id = auth.uid()
        AND is_partner()
    );

CREATE POLICY "activity_insert_admin" ON public.partner_activity_log FOR INSERT
    WITH CHECK (is_admin());

-- lead_status_history: partner inserts for assigned leads, admin inserts any
DROP POLICY IF EXISTS "history_insert" ON public.lead_status_history;
CREATE POLICY "history_insert_partner" ON public.lead_status_history FOR INSERT
    WITH CHECK (
        changed_by = auth.uid()
        AND is_partner()
        AND EXISTS (
            SELECT 1 FROM public.leads
            WHERE id = lead_id AND assigned_to = auth.uid()
        )
    );

CREATE POLICY "history_insert_admin" ON public.lead_status_history FOR INSERT
    WITH CHECK (changed_by = auth.uid() AND is_admin());


-- ============================================
-- FIX 4: Restrict partner daily report UPDATE to current date only
-- ============================================
DROP POLICY IF EXISTS "reports_update_partner" ON public.daily_reports;

CREATE POLICY "reports_update_partner" ON public.daily_reports FOR UPDATE
    USING (partner_id = auth.uid() AND report_date = CURRENT_DATE)
    WITH CHECK (partner_id = auth.uid() AND report_date = CURRENT_DATE);


-- ============================================
-- VERIFICATION QUERIES (run these to confirm fixes)
-- ============================================
-- SELECT schemaname, tablename, policyname, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename IN ('leads', 'daily_reports', 'lead_status_history', 'partner_activity_log')
-- ORDER BY tablename, policyname;
