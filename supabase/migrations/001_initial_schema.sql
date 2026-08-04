-- ============================================
-- Revenue Partner Workspace — Initial Schema
-- Supabase Migration 001
-- 2026-07-13
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- PROFILES (one per auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'partner')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);

-- REGIONS
CREATE TABLE public.regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- PARTNERS
CREATE TABLE public.partners (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_id TEXT NOT NULL UNIQUE,
    region_id UUID REFERENCES public.regions(id),
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_partners_region ON public.partners(region_id);
CREATE INDEX idx_partners_status ON public.partners(status);

-- LEADS
CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL,
    website TEXT,
    phone TEXT,
    email TEXT,
    industry TEXT,
    country TEXT,
    internal_notes TEXT,
    status TEXT NOT NULL DEFAULT 'not_contacted' CHECK (status IN (
        'not_contacted', 'contacted', 'follow_up_required',
        'appointment_booked', 'closed', 'not_interested', 'invalid_contact'
    )),
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    assigned_to UUID REFERENCES public.partners(id),
    assigned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_leads_status ON public.leads(status);
CREATE INDEX idx_leads_assigned_to ON public.leads(assigned_to);
CREATE INDEX idx_leads_created_by ON public.leads(created_by);

-- DAILY REPORTS
CREATE TABLE public.daily_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partners(id),
    report_date DATE NOT NULL DEFAULT CURRENT_DATE,
    leads_contacted INTEGER NOT NULL DEFAULT 0 CHECK (leads_contacted >= 0),
    appointments_booked INTEGER NOT NULL DEFAULT 0 CHECK (appointments_booked >= 0),
    deals_closed INTEGER NOT NULL DEFAULT 0 CHECK (deals_closed >= 0),
    biggest_challenge TEXT,
    additional_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (partner_id, report_date)
);

CREATE INDEX idx_reports_partner_date ON public.daily_reports(partner_id, report_date);
CREATE INDEX idx_reports_date ON public.daily_reports(report_date);

-- ANNOUNCEMENTS
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcements_display ON public.announcements(is_pinned DESC, created_at DESC);

-- RESOURCES
CREATE TABLE public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('document', 'link', 'video', 'faq')),
    url TEXT,
    file_path TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_resources_active_order ON public.resources(is_active, sort_order);

-- LEAD STATUS HISTORY (audit trail)
CREATE TABLE public.lead_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES public.profiles(id),
    old_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_history_lead ON public.lead_status_history(lead_id, changed_at DESC);

-- PARTNER ACTIVITY LOG
CREATE TABLE public.partner_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES public.partners(id),
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_partner ON public.partner_activity_log(partner_id, created_at DESC);
CREATE INDEX idx_activity_action ON public.partner_activity_log(action);

-- ============================================
-- TRIGGER: AUTO-UPDATE updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_partners_updated_at BEFORE UPDATE ON public.partners
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_leads_updated_at BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_daily_reports_updated_at BEFORE UPDATE ON public.daily_reports
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_announcements_updated_at BEFORE UPDATE ON public.announcements
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_resources_updated_at BEFORE UPDATE ON public.resources
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_regions_updated_at BEFORE UPDATE ON public.regions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- TRIGGER: AUTO-CREATE PROFILE ON USER SIGNUP
-- (safety net for admin-created auth users)
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, is_active)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'partner'),
        true
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- RLS HELPER FUNCTIONS
-- ============================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
          AND is_active = true
    );
$$;

CREATE OR REPLACE FUNCTION public.is_partner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'partner'
          AND is_active = true
    );
$$;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "profiles_select_admin" ON public.profiles FOR SELECT
    USING (is_admin());

CREATE POLICY "profiles_insert_admin" ON public.profiles FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_admin" ON public.profiles FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

-- PARTNERS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partners_select_own" ON public.partners FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "partners_select_admin" ON public.partners FOR SELECT
    USING (is_admin());

CREATE POLICY "partners_manage_admin" ON public.partners FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- LEADS (critical — most sensitive table)
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_select_partner" ON public.leads FOR SELECT
    USING (
        assigned_to = auth.uid()
        AND EXISTS (
            SELECT 1 FROM public.partners
            WHERE id = auth.uid() AND status = 'active'
        )
    );

CREATE POLICY "leads_select_admin" ON public.leads FOR SELECT
    USING (is_admin());

CREATE POLICY "leads_insert_admin" ON public.leads FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "leads_update_partner_status" ON public.leads FOR UPDATE
    USING (
        assigned_to = auth.uid()
        AND is_partner()
    )
    WITH CHECK (
        assigned_to = auth.uid()
        AND is_partner()
    );

CREATE POLICY "leads_update_admin" ON public.leads FOR UPDATE
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "leads_delete_admin" ON public.leads FOR DELETE
    USING (is_admin());

-- DAILY REPORTS
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_select_partner" ON public.daily_reports FOR SELECT
    USING (partner_id = auth.uid());

CREATE POLICY "reports_select_admin" ON public.daily_reports FOR SELECT
    USING (is_admin());

CREATE POLICY "reports_insert_partner" ON public.daily_reports FOR INSERT
    WITH CHECK (
        partner_id = auth.uid()
        AND is_partner()
    );

CREATE POLICY "reports_update_partner" ON public.daily_reports FOR UPDATE
    USING (partner_id = auth.uid())
    WITH CHECK (partner_id = auth.uid());

-- ANNOUNCEMENTS
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "announcements_select" ON public.announcements FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "announcements_manage_admin" ON public.announcements FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- RESOURCES
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "resources_select_partner" ON public.resources FOR SELECT
    USING (is_active = true);

CREATE POLICY "resources_select_admin" ON public.resources FOR SELECT
    USING (is_admin());

CREATE POLICY "resources_manage_admin" ON public.resources FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- REGIONS
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "regions_select" ON public.regions FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "regions_manage_admin" ON public.regions FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- LEAD STATUS HISTORY
ALTER TABLE public.lead_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "history_select_partner" ON public.lead_status_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.leads
            WHERE leads.id = lead_id
            AND leads.assigned_to = auth.uid()
        )
    );

CREATE POLICY "history_select_admin" ON public.lead_status_history FOR SELECT
    USING (is_admin());

-- PARTNER ACTIVITY LOG
ALTER TABLE public.partner_activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_select_own" ON public.partner_activity_log FOR SELECT
    USING (partner_id = auth.uid());

CREATE POLICY "activity_select_admin" ON public.partner_activity_log FOR SELECT
    USING (is_admin());

-- ============================================
-- SEED DATA: default regions
-- ============================================
INSERT INTO public.regions (name, description) VALUES
    ('North America', 'United States and Canada'),
    ('Europe', 'European Union and UK'),
    ('Asia Pacific', 'APAC region'),
    ('Middle East', 'MEA region'),
    ('Latin America', 'LATAM region')
ON CONFLICT (name) DO NOTHING;
