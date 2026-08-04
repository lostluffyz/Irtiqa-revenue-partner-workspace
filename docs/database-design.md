# Database Design

**Revenue Partner Workspace — Irtiqa AI**
**Document version:** 1.0
**Last updated:** 2026-07-13

---

## 1. Principles

- Every table has `created_at` and `updated_at` timestamps
- UUID primary keys for all tables (except reference/lookup tables)
- Text fields with CHECK constraints for enums (not native PG enums for migration simplicity)
- All foreign keys are indexed
- RLS enabled on every table that contains user-specific or confidential data
- Timestamps use `timestamptz` (timezone-aware)

## 2. Database Tables

### 2.1 `profiles`

Linked one-to-one with `auth.users`. Contains every user in the system regardless of role.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, references auth.users.id ON DELETE CASCADE | |
| `email` | `text` | NOT NULL, UNIQUE | Internal email address |
| `full_name` | `text` | NOT NULL | Display name |
| `role` | `text` | NOT NULL, CHECK (role IN ('admin', 'partner')) | User role |
| `is_active` | `boolean` | NOT NULL, DEFAULT true | Soft disable |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | |

**Indexes:** `idx_profiles_role` on `(role)`, `idx_profiles_email` on `(email)` (unique already covers)
**RLS:** Enabled
**Policies:**
- SELECT: own row OR admin role
- INSERT: admin only (via service_role or admin API)
- UPDATE: own row OR admin role
- DELETE: no direct deletion (use is_active = false)

### 2.2 `regions`

Reference table for regions assigned to partners.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `name` | `text` | NOT NULL, UNIQUE | e.g., "North America", "Europe" |
| `description` | `text` | | Optional description |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | |

**RLS:** Enabled
**Policies:**
- SELECT: authenticated users
- INSERT/UPDATE/DELETE: admin only

### 2.3 `partners`

Revenue Partner specific data. One row per partner, linked one-to-one with `profiles`.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, references profiles.id ON DELETE CASCADE | |
| `company_id` | `text` | NOT NULL, UNIQUE | Human-readable ID, e.g., "RP-1001" |
| `region_id` | `uuid` | REFERENCES regions.id, nullable | Assigned region |
| `phone` | `text` | | Contact phone |
| `status` | `text` | NOT NULL, DEFAULT 'active', CHECK (status IN ('active', 'inactive', 'suspended')) | |
| `last_login_at` | `timestamptz` | | Track last login |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | |

**Indexes:** `idx_partners_company_id` on `(company_id)` (unique covers), `idx_partners_region` on `(region_id)`, `idx_partners_status` on `(status)`
**RLS:** Enabled
**Policies:**
- SELECT: own row OR admin
- INSERT/UPDATE/DELETE: admin only

### 2.4 `leads`

Lead/contact records uploaded by admin and assigned to partners.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `company_name` | `text` | NOT NULL | |
| `website` | `text` | | |
| `phone` | `text` | | |
| `email` | `text` | | |
| `industry` | `text` | | |
| `country` | `text` | | |
| `internal_notes` | `text` | | Visible only to admin |
| `status` | `text` | NOT NULL, DEFAULT 'not_contacted', CHECK (status IN ('not_contacted', 'contacted', 'follow_up_required', 'appointment_booked', 'closed', 'not_interested', 'invalid_contact')) | |
| `created_by` | `uuid` | NOT NULL, references profiles.id | Admin who uploaded |
| `assigned_to` | `uuid` | REFERENCES partners.id, nullable | Current assignee (denormalized for query speed) |
| `assigned_at` | `timestamptz` | | When assigned |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | |

**Indexes:** `idx_leads_status` on `(status)`, `idx_leads_assigned_to` on `(assigned_to)`, `idx_leads_created_by` on `(created_by)`, `idx_leads_country` on `(country)`, `idx_leads_industry` on `(industry)`
**RLS:** Enabled
**Policies:**
- SELECT: assigned partner OR admin (admin can see all)
- INSERT: admin only
- UPDATE status: assigned partner OR admin
- UPDATE full record: admin only
- DELETE: admin only

### 2.5 `daily_reports`

One report per partner per day. The unique constraint prevents duplicate submissions.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `partner_id` | `uuid` | NOT NULL, references partners.id | |
| `report_date` | `date` | NOT NULL, DEFAULT CURRENT_DATE | |
| `leads_contacted` | `integer` | NOT NULL, DEFAULT 0, CHECK (>= 0) | |
| `appointments_booked` | `integer` | NOT NULL, DEFAULT 0, CHECK (>= 0) | |
| `deals_closed` | `integer` | NOT NULL, DEFAULT 0, CHECK (>= 0) | |
| `biggest_challenge` | `text` | | |
| `additional_notes` | `text` | | |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | |

**Constraints:** `UNIQUE (partner_id, report_date)` — one report per partner per day
**Indexes:** `idx_reports_partner_date` on `(partner_id, report_date)`, `idx_reports_date` on `(report_date)`
**RLS:** Enabled
**Policies:**
- SELECT: own reports OR admin
- INSERT: own profile (partner), only if no report exists for today
- UPDATE: own reports within same day OR admin
- DELETE: admin only

### 2.6 `announcements`

Admin-created announcements visible to all partners.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `title` | `text` | NOT NULL | |
| `content` | `text` | NOT NULL | |
| `is_pinned` | `boolean` | NOT NULL, DEFAULT false | |
| `created_by` | `uuid` | NOT NULL, references profiles.id | Admin |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | |

**Indexes:** `idx_announcements_pinned` on `(is_pinned, created_at DESC)`, `idx_announcements_created_by` on `(created_by)`
**RLS:** Enabled
**Policies:**
- SELECT: authenticated users
- INSERT/UPDATE/DELETE: admin only

### 2.7 `resources`

Digital resources available to partners.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `title` | `text` | NOT NULL | Display title |
| `description` | `text` | | |
| `type` | `text` | NOT NULL, CHECK (type IN ('document', 'link', 'video', 'faq')) | |
| `url` | `text` | | URL for links/videos |
| `file_path` | `text` | | Supabase Storage path for documents |
| `sort_order` | `integer` | NOT NULL, DEFAULT 0 | Display ordering |
| `is_active` | `boolean` | NOT NULL, DEFAULT true | Visibility toggle |
| `created_by` | `uuid` | NOT NULL, references profiles.id | Admin |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | |

**Indexes:** `idx_resources_active_order` on `(is_active, sort_order)`, `idx_resources_type` on `(type)`
**RLS:** Enabled
**Policies:**
- SELECT: all authenticated users (active only for partners, all for admin)
- INSERT/UPDATE/DELETE: admin only

### 2.8 `lead_status_history`

Audit trail recording every lead status change.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `lead_id` | `uuid` | NOT NULL, references leads.id ON DELETE CASCADE | |
| `changed_by` | `uuid` | NOT NULL, references profiles.id | |
| `old_status` | `text` | NOT NULL | |
| `new_status` | `text` | NOT NULL | |
| `changed_at` | `timestamptz` | NOT NULL, DEFAULT now() | |

**Indexes:** `idx_history_lead` on `(lead_id, changed_at DESC)`, `idx_history_changed_by` on `(changed_by)`
**RLS:** Enabled
**Policies:**
- SELECT: admin OR partner assigned to the lead
- INSERT: application-managed (trigger or server action)

### 2.9 `partner_activity_log`

General audit log for partner actions.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, DEFAULT gen_random_uuid() | |
| `partner_id` | `uuid` | NOT NULL, references partners.id | |
| `action` | `text` | NOT NULL | e.g., 'login', 'status_update', 'report_submitted' |
| `details` | `jsonb` | | Flexible context data |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |

**Indexes:** `idx_activity_partner` on `(partner_id, created_at DESC)`, `idx_activity_action` on `(action)`
**RLS:** Enabled
**Policies:**
- SELECT: own activity OR admin
- INSERT: application-managed

## 3. Entity Relationship Diagram

```
auth.users
    │ (1:1)
    ▼
profiles ────  partners ──── regions
    │ (1:N)       │ (1:N)       │
    │             │             │
    │             ▼             │
    │         daily_reports     │
    │             │             │
    │             │ (created_by)│
    │             ▼             │
    │         announcements     │
    │             │             │
    │             ▼             │
    │         resources         │
    │                           │
    │ (assigned_to)             │
    ├──────── leads ────────────┤
    │           │               │
    │           │ (lead_id)     │
    │           ▼               │
    │     lead_status_history   │
    │                           │
    └──── partner_activity_log  │
```

## 4. Migration SQL

The full migration script is in `supabase/migrations/001_initial_schema.sql`.

```sql
-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types (using text + check for simplicity)
-- No native enums to avoid migration complexity

-- ============================================
-- PROFILES
-- ============================================
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

-- ============================================
-- REGIONS
-- ============================================
CREATE TABLE public.regions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- PARTNERS
-- ============================================
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

-- ============================================
-- LEADS
-- ============================================
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
CREATE INDEX idx_leads_country ON public.leads(country);
CREATE INDEX idx_leads_industry ON public.leads(industry);

-- ============================================
-- DAILY REPORTS
-- ============================================
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

CREATE INDEX idx_reports_date ON public.daily_reports(report_date);

-- ============================================
-- ANNOUNCEMENTS
-- ============================================
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_announcements_pinned ON public.announcements(is_pinned DESC, created_at DESC);
CREATE INDEX idx_announcements_created_by ON public.announcements(created_by);

-- ============================================
-- RESOURCES
-- ============================================
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
CREATE INDEX idx_resources_type ON public.resources(type);

-- ============================================
-- LEAD STATUS HISTORY
-- ============================================
CREATE TABLE public.lead_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES public.profiles(id),
    old_status TEXT NOT NULL,
    new_status TEXT NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_history_lead ON public.lead_status_history(lead_id, changed_at DESC);
CREATE INDEX idx_history_changed_by ON public.lead_status_history(changed_by);

-- ============================================
-- PARTNER ACTIVITY LOG
-- ============================================
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
-- TRIGGER: Auto-update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER partners_updated_at BEFORE UPDATE ON public.partners
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER leads_updated_at BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER daily_reports_updated_at BEFORE UPDATE ON public.daily_reports
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER announcements_updated_at BEFORE UPDATE ON public.announcements
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER resources_updated_at BEFORE UPDATE ON public.resources
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER regions_updated_at BEFORE UPDATE ON public.regions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- TRIGGER: Auto-create profile on auth.users insert
-- ============================================
-- NOTE: This is a safety net. The primary profile creation
-- happens in the admin API when creating partners/admins.
-- This trigger ensures consistency if users are created via Supabase dashboard.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## 5. Supabase Storage Buckets

### Bucket: `resources`

| Property | Value |
|---|---|
| Name | `resources` |
| Public | Yes (files are linked, not listed) |
| Allowed MIME | `application/pdf`, `image/png`, `image/jpeg`, `text/plain`, `application/msword`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document` |
| Max file size | 10 MB |

**RLS Policy:**
- SELECT: authenticated users
- INSERT/UPDATE/DELETE: admin only
