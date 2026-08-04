# Security Model

**Revenue Partner Workspace — Irtiqa AI**
**Document version:** 1.7 (updated 2026-07-14 — Migration 008, Company ID volatility fix)

---

## 1. Security Principles

| Principle | Implementation |
|---|---|
| **Defense in Depth** | Auth + RLS + Middleware + Trigger-based column protection + Server Action authz — 5 independent layers |
| **Least Privilege** | Every database query scoped to minimum needed data |
| **Server-Side Authorization** | No security decision relies on client-side code |
| **Row Level Security Primary** | RLS acts as the final data boundary |
| **No Public Registration** | Only admin can create users via the admin panel or seed script |
| **Session-Based Auth** | Cookie-based sessions via @supabase/ssr |
| **Service Role Key Isolation** | Service_role key never touches browser — runtime guard in adminClient |
| **Server Action Authorization** | Every privileged mutation calls `requireAdmin()` or `requirePartner()` before using the admin client |
| **Input Validation** | All mutation inputs validated with Zod schemas |
| **Partner RLS Boundary** | Partners operate under RLS with publishable key — no privileged client for partner operations |

## 2. Authentication Architecture

### 2.1 Company ID → Email Mapping

Revenue Partners authenticate using Company ID (e.g., "RP-1001") instead of email.

**Mapping rule:** `{company_id_lowercase}@rp.irtiqa.internal`

**Implementation:** `src/lib/auth.ts`

```typescript
const PARTNER_EMAIL_DOMAIN = "rp.irtiqa.internal";

export function toAuthEmail(companyId: string): string {
  return `${companyId.trim().toLowerCase()}@${PARTNER_EMAIL_DOMAIN}`;
}
```

**Validation:** `isValidCompanyId()` checks:
- Min length 3, max length 32
- Only alphanumeric, hyphens, underscores

### 2.2 Auth Flow (Implemented)

| Step | Component | File |
|---|---|---|
| 1. User enters credentials | Login page (Client Component) | `src/app/(auth)/login/page.tsx` |
| 2. Company ID → email mapping | `toAuthEmail()` | `src/lib/auth.ts` |
| 3. Supabase Auth call | `signInWithPassword()` | `src/lib/auth.ts` |
| 4. Session cookie set | @supabase/ssr | `src/lib/supabase/server.ts` |
| 5. Role-based redirect | Login page + middleware | Both |
| 6. Route protection | Proxy (session + role check) | `src/proxy.ts` |

## 3. Authorization Layers (Implemented)

### Layer 1: Supabase Auth
- Validates identity via email/password
- Issues session cookies via @supabase/ssr

### Layer 2: Route Protection (Middleware)
- Checks session on every protected request
- Fetches profile role from `profiles` table
- Redirects `/admin` users from `/partner` routes and vice versa
- Redirects unauthenticated users to `/login`

### Layer 3: Server Action Authorization
Every privileged server action calls `requireAdmin()` at the top **before** doing anything else:

```typescript
// Typical server action pattern (leads/actions.ts, partners/actions.ts, etc.)
export async function someAdminAction(_prev: unknown, formData: FormData) {
  await requireAdmin();           // ← Authorization gate — throws if not admin

  // ... parse and validate input with Zod ...
  // ... use adminClient for database operations ...
}
```

`requireAdmin()` (defined in `src/lib/admin.ts`):
1. Gets the authenticated user session from the server Supabase client
2. Fetches the user's profile from the `profiles` table
3. Verifies `role === 'admin'` AND `is_active === true`
4. Returns the profile and a validated Supabase client
5. Throws `UnauthorizedError` (redirects to `/login`) if any check fails

### Layer 4: Row Level Security (Database)
All 9 tables have RLS enabled with granular policies. Verified on hosted database.

### Layer 5: Column-Level Trigger (Leads)
`trg_check_lead_partner_update` — BEFORE UPDATE on `leads` blocks partners from modifying non-status columns.

## 4. Authorization Architecture

### 4.1 The `requireAdmin()` Gate

```typescript
// src/lib/admin.ts
export async function requireAdmin(): Promise<AdminAuthResult> {
  const supabase = await createClient();       // Server Supabase client (cookie-based session)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new UnauthorizedError();

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || !profile.is_active) {
    throw new UnauthorizedError();
  }

  return { profile, supabase };
}
```

**Key property:** The admin client (`adminClient`) that has the service-role key is **never** used directly from client components. All database mutations flow through server actions which first call `requireAdmin()`.

### 4.2 Component Pattern

```
Client Component (e.g., form)
  → Server Action ("use server")
    → requireAdmin() — authz gate
    → Zod schema validation
    → adminClient — privileged database operations
```

## 5. Phase 2 Security Controls (Verified 2026-07-13)

### 5.1 Partner Creation Security

| Concern | Control | Status |
|---|---|---|
| Cannot create admin role | `CreatePartnerSchema` only allows `fullName`, `regionId`, `phone`, `initialPassword` — no role field | ✅ |
| Cannot forge Company ID | Company ID generated by DB sequence `generate_company_id()`, not client input | ✅ |
| Password never persisted | Password set via `auth.admin.createUser()`, never stored in application tables | ✅ |
| Cleanup on failure | If profile or partner insert fails, the auth user is deleted (rollback) | ✅ |
| Password reset | Reset via `auth.admin.updateUserById()`, new password returned in response, never logged | ✅ |

### 5.2 Lead Management Security

| Concern | Control | Status |
|---|---|---|
| Bulk assign validates partner | `assignLeads()` checks partner exists and `status === 'active'` | ✅ |
| Batch size limit | Maximum 500 leads per batch (Zod + server-side check) | ✅ |
| CSV upload field restrictions | `assigned_to` cannot be set via CSV — row builder hardcodes `status: "not_contacted"` | ✅ |
| CSV file limits | 5MB file size, 5000 row maximum | ✅ |
| CSV parse safety | Manual parser (no eval, no external dependency) | ✅ |
| No bulk export | Lead export endpoint not implemented | ✅ |

### 5.3 Input Validation (Zod Schemas)

| Schema | Validates | File |
|---|---|---|
| `CreatePartnerSchema` | fullName (1-200 chars), regionId (UUID), phone (optional), initialPassword (optional, min 8) | `admin.ts` |
| `ResetPasswordSchema` | partnerId (UUID), newPassword (8-128 chars) | `admin.ts` |
| `UpdatePartnerStatusSchema` | partnerId (UUID), status (enum: active/inactive/suspended) | `admin.ts` |
| `UpdatePartnerRegionSchema` | partnerId (UUID), regionId (UUID) | `admin.ts` |
| `LeadAssignmentSchema` | leadIds (UUID array, 1-500), partnerId (UUID) | `admin.ts` |
| `AnnouncementSchema` | title (1-300), content (1-10000), isPinned (boolean) | `admin.ts` |
| `ResourceSchema` | title (1-300), description (optional), type (enum), url (optional), sortOrder, isActive | `admin.ts` |

### 5.4 Password Security

| Operation | Method | Password Exposure |
|---|---|---|
| Create partner | `auth.admin.createUser()` with temporary password | Returned once in response; never stored in DB |
| Reset password | `auth.admin.updateUserById()` with new password or auto-generated | Returned once in response; never stored in DB |
| Partner sign-in | Standard `signInWithPassword()` via server client | Standard session cookie |

## 6. Helper Functions (Verified on Hosted Database)

```sql
-- Check if current user is admin (with active profile)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'admin'
          AND is_active = true
    );
$$;

-- Check if current user is partner (with active profile)
CREATE OR REPLACE FUNCTION public.is_partner()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role = 'partner'
          AND is_active = true
    );
$$;
```

**Verified:** Both functions use `SECURITY DEFINER` with fixed `search_path = public` on the hosted database.

## 7. RLS Policy Definitions (Verified on Hosted Database)

### `profiles`
- SELECT: own row (id = auth.uid()) OR admin
- INSERT: admin only
- UPDATE: own row (WITH CHECK protects role column — migration 006) OR admin (full access)

### `partners`
- SELECT: own row OR admin
- ALL (INSERT/UPDATE/DELETE): admin only

### `leads` — Most Sensitive Table
- **Partner SELECT**: `assigned_to = auth.uid()` AND `partners.status = 'active'` **verified**
- **Admin SELECT**: `is_admin()` **verified**
- **Partner UPDATE (status only)**: `assigned_to = auth.uid()` AND `is_partner()` AND `partners.status = 'active'` **verified**
- **Admin UPDATE**: `is_admin()` **verified**
- **INSERT**: admin only **verified**
- **DELETE**: admin only **verified**

### `daily_reports`
- **Partner SELECT**: `partner_id = auth.uid()`
- **Partner INSERT**: `partner_id = auth.uid()` AND `is_partner()`
- **Partner UPDATE**: REMOVED in migration 005 — partners can no longer update any daily reports
- **Admin UPDATE**: `is_admin()` (migration 005)
- **Admin DELETE/SELECT/INSERT**: full access

### `announcements`, `regions`
- Authenticated users can SELECT
- Admin can manage (ALL)

### `resources`
- **Partner SELECT**: `auth.role() = 'authenticated' AND is_active = true` (migration 007 — added auth.role() check; previously allowed anonymous access)
- Admin can manage (ALL)

### `lead_status_history`, `partner_activity_log`
- **Partner SELECT**: own context (assigned leads for history, own ID for activity)
- **Admin SELECT**: all records
- **Partner INSERT**: own context (must be owned) **verified**
- **Admin INSERT**: admin context **verified**

## 8. Column-Level Security (Migration 002 — Verified on Hosted Database)

### Partner lead UPDATE trigger: `trg_check_lead_partner_update`

Verified present on `leads` table with `SECURITY DEFINER` and `search_path=public`. Blocks partners from modifying `company_name`, `website`, `phone`, `email`, `industry`, `country`, `internal_notes`, `created_by`, `assigned_to`, `assigned_at`, `created_at`. Only `status` passes through.

## 9. Additional Security Fixes (Migration 002 — Verified on Hosted Database)

| Finding | Fix | Status |
|---|---|---|
| Partner UPDATE policy didn't check `partners.status = 'active'` | Added existence check to USING and WITH CHECK | ✅ Verified |
| Missing INSERT policies on `partner_activity_log` | Added `activity_insert_partner` and `activity_insert_admin` | ✅ Verified |
| Missing INSERT policies on `lead_status_history` | Added `history_insert_partner` and `history_insert_admin` | ✅ Verified |
| Partner could edit historical daily reports | Restricted UPDATE to `report_date = CURRENT_DATE` | ✅ Verified |

## 10. Service Role Key Protection

The admin client (`src/lib/supabase/admin.ts`) uses:
- **Runtime guard**: `typeof window !== "undefined"` throws an error if the module is accidentally imported on the client
- **No Database generic**: Avoids type complexity with supabase-js v2
- **Explicit configuration**: `autoRefreshToken: false, persistSession: false`

The admin client is only used inside server actions (which run on the server) after `requireAdmin()` has authorized the request.

## 11. Proxy Route Protection

The route protection boundary uses Next.js 16's `proxy.ts` convention (replaces the deprecated `middleware.ts`).

```typescript
// src/proxy.ts
// Protects /admin and /partner routes based on session + role

PUBLIC_ROUTES = ["/login"];

// Unauthenticated → /login
// Wrong role → correct dashboard
// Authenticated on /login → dashboard redirect
```

## 12. Environment Variable Protection

| Variable | Where Used | Protection |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Public by design (used with publishable key) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Client + Server | Low-privilege (RLS-bound) |
| `SUPABASE_SECRET_KEY` | Admin client only | Runtime guard against client import |

## 13. Security Regression Review (Phase 1 Hardening — 2026-07-13)

Migration 002 was reviewed for vulnerabilities in the hardening pass (2026-07-13):

### Lead Column Protection Trigger (`check_lead_partner_update`)

| Concern | Verdict |
|---|---|
| Permits partners to change `status` | ✅ `status` is NOT in the comparison list — changes pass through |
| Prevents partners changing `assigned_to` | ✅ Listed in comparison — exception raised |
| Prevents partners changing `internal_notes` | ✅ Listed — exception raised |
| Prevents partners changing company/contact fields | ✅ All protected fields listed |
| Does not block legitimate admin updates | ✅ Trigger only fires for `v_role = 'partner'` — admin bypasses |
| Bypass via Supabase API | ✅ Trigger is a database-level constraint — fires on all UPDATE operations regardless of API entry point |
| `auth.uid()` availability inside trigger | ✅ Available for authenticated requests. Falls back to no-op for superuser operations |

### Audit Table INSERT Policies

| Policy | Forge Protection |
|---|---|
| `activity_insert_partner` | `partner_id = auth.uid()` — partner can only create entries for themselves |
| `history_insert_partner` | `changed_by = auth.uid()` AND lead must be assigned to partner — cannot forge history for other leads or users |
| `history_insert_admin` | Must be admin AND `changed_by = auth.uid()` — cannot forge entries under another admin's name |

**Result: No vulnerabilities found.**

## 14. Database Constraints (Verified on Hosted Database)

| Table | Constraint | Status |
|---|---|---|
| `daily_reports` | UNIQUE (partner_id, report_date) — one report per partner per day | ✅ Verified |
| `profiles` | CHECK (role IN ('admin', 'partner')) | ✅ Verified |
| `partners` | CHECK (status IN ('active', 'inactive', 'suspended')) | ✅ Verified |
| `leads` | CHECK (status IN ('not_contacted', 'contacted', 'follow_up_required', 'appointment_booked', 'closed', 'not_interested', 'invalid_contact')) | ✅ Verified |
| `profiles` | FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE | ✅ Verified |

## 15. Phase 2 Security Verification Checklist

### Server Action Authorization
- [x] `assignLeadsAction` calls `requireAdmin()` before processing
- [x] `uploadCsvAction` calls `requireAdmin()` before processing
- [x] `createPartnerAction` calls `requireAdmin()` before processing
- [x] `resetPasswordAction` calls `requireAdmin()` before processing
- [x] `updatePartnerStatusAction` calls `requireAdmin()` before processing
- [x] `updatePartnerRegionAction` calls `requireAdmin()` before processing
- [x] `createAnnouncementAction` calls `requireAdmin()` before processing
- [x] `updateAnnouncementAction` calls `requireAdmin()` before processing
- [x] `deleteAnnouncementAction` calls `requireAdmin()` before processing
- [x] `createResourceAction` calls `requireAdmin()` before processing
- [x] `updateResourceAction` calls `requireAdmin()` before processing
- [x] `deleteResourceAction` calls `requireAdmin()` before processing

### Input Validation
- [x] All server actions use Zod `.safeParse()` for validation
- [x] File upload: size (5MB) and row (5000) limits enforced on server
- [x] Batch operations: max 500 leads per bulk assign
- [x] UUID validation on all ID fields (user IDs, region IDs, lead IDs)

### Client-Side Safety
- [x] No client component imports server-only Supabase client
- [x] Admin client has runtime guard against client import
- [x] Client components use server actions, never direct DB access
- [x] All Server Action imports in Client Components are via `"./actions"` not `"@/lib/admin"`

### Data Protection
- [x] Partner passwords never stored in application tables
- [x] Company ID generation is server-only (DB sequence)
- [x] CSV upload cannot set `assigned_to`, `created_by`, or `status` (hardcoded)
- [x] Activity log entries don't expose passwords or secrets
- [x] No bulk data export endpoints

## 16. Phase 3 Security — Partner Workspace

### 16.1 The `requirePartner()` Gate

Added in Phase 3 for partner-focused authorization. Defined in `src/lib/partner.ts`:

```typescript
export async function requirePartner(): Promise<PartnerAuthResult> {
  const supabase = await createClient();

  // 1. Session check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required");

  // 2. Profile check — role + active
  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", user.id).single();

  if (!profile || profile.role !== "partner" || !profile.is_active) {
    throw new Error("Partner access required");
  }

  // 3. Partner record check — status + active
  const { data: partner } = await supabase
    .from("partners").select("*").eq("id", user.id).single();

  if (!partner || partner.status !== "active") {
    throw new Error("Partner account is not active");
  }

  return { profile, partner, supabase };
}
```

**Key differences from `requireAdmin()`:**
- Returns the partner record (with `program_start_date`) in addition to profile
- Uses the regular server client (publishable key) — no privileged admin client
- Verifies both `profiles.is_active` AND `partners.status === 'active'`
- Used by all partner server actions and server component pages

### 16.2 Partner Data Access

| Operation | Client | Authorization | Notes |
|---|---|---|---|
| View assigned leads | Server/publishable | requirePartner() + RLS | RLS filters to assigned leads |
| Update lead status | Server/publishable | requirePartner() + RLS | RLS + trigger restrict allowed columns |
| Submit daily report | Server/publishable | requirePartner() + RLS | UNIQUE constraint blocks duplicates |
| Submit daily report (one only) | Server/publishable | requirePartner() + RLS | UNIQUE + server action pre-check + no partner UPDATE policy |
| View resources | Server/publishable | requirePartner() + RLS | RLS restricts to is_active = true |
| View announcements | Server/publishable | requirePartner() + RLS | Authenticated users can read |

### 16.3 Phase 3 Security Controls

| Concern | Control | Status |
|---|---|---|
| Partner cannot access admin routes | Proxy role-gating (src/proxy.ts) | ✅ |
| Partner cannot modify lead columns other than status | Trigger `trg_check_lead_partner_update` | ✅ |
| Partner cannot forge activity entries | RLS: partner_id = auth.uid() | ✅ |
| Partner cannot forge status history | RLS: changed_by = auth.uid() AND lead assigned to partner | ✅ |
| One daily report per day | UNIQUE(partner_id, report_date) | ✅ |
| Partner cannot edit any reports (immutable) | Migration 005: removed partner UPDATE RLS policy entirely | ✅ |
| Partner account deactivation | requirePartner() checks both profile.is_active and partner.status | ✅ |
| No bulk lead export | No export endpoint exists | ✅ |
| Anti-exfiltration on leads | Pagination (50/page), no select-all, no CSV export | ✅ |

## 17. Program Timezone (Phase 5)

*Added 2026-07-14*

### Configuration

The program timezone is configured via `PROGRAM_TIMEZONE` env var (default: `Asia/Kolkata`):

```typescript
// src/lib/program-timezone.ts
export function getProgramTimezone(): string {
  return process.env.PROGRAM_TIMEZONE || "Asia/Kolkata";
}
```

### Key Functions

| Function | Returns | Description |
|---|---|---|
| `getBusinessDate(tz?)` | YYYY-MM-DD | Current date in program timezone using `Intl.DateTimeFormat` |
| `getProgramDay(startDate, tz?)` | number | 1-indexed program day (negative pre-program, capped at 365) |
| `getProgramStatus(startDate, tz?)` | ProgramStatus | Structured status with phase (pre/active/post), days remaining |
| `isProgramActive(startDate, tz?)` | boolean | True if business date ≥ program start |
| `formatBusinessDate(dateStr, tz?)` | string | User-friendly date display |

### Security Model

- All business-date calculations use the configured timezone, NOT UTC or server local time
- This ensures consistent program day, daily report date, and streak calculation regardless of server location or browser locale
- Daily report submissions use `getBusinessDate(PROGRAM_TIMEZONE)` for `report_date`
- Admin dashboard report filters also use the program timezone
- Test environment uses `PROGRAM_TIMEZONE=UTC` for deterministic test results

### Consumer Files Updated (Phase 5)

| File | Change |
|---|---|
| `src/lib/partner.ts` | PROGRAM_TIMEZONE from env var delegates to program-timezone.ts |
| `src/app/(dashboard)/partner/page.tsx` | Dashboard today uses getBusinessDate(PROGRAM_TIMEZONE) |
| `src/app/(dashboard)/partner/actions.ts` | Report submission today uses getBusinessDate(PROGRAM_TIMEZONE) |
| `src/app/(dashboard)/partner/report/page.tsx` | Report page today uses getBusinessDate(PROGRAM_TIMEZONE) |
| `src/app/(dashboard)/admin/page.tsx` | Admin report filters use getBusinessDate() |
| `src/lib/admin.ts` | createPartner() program_start_date uses getBusinessDate() |

## 18. Migration 007 — Resources RLS Fix (Phase 5)

*Applied 2026-07-14*

### Finding
The `resources_select_partner` RLS policy only checked `is_active = true` without verifying the user was authenticated. This meant any unauthenticated (anonymous) user could read active resources.

### Fix
```sql
DROP POLICY IF EXISTS "resources_select_partner" ON public.resources;
CREATE POLICY "resources_select_partner" ON public.resources FOR SELECT
    USING (auth.role() = 'authenticated' AND is_active = true);
```

### Verification
- Anonymous query to `/rest/v1/resources` returns empty array `[]`
- Authenticated partner can still read active resources
- Admin can still read all resources (via `resources_select_admin` and `resources_manage_admin`)

## 19. Hosted QA Acceptance Script (Phase 5)

*Added 2026-07-14*

A comprehensive automated acceptance test runs against the hosted Supabase instance:

```bash
npm run qa:hosted
```

Tests 9 sections (40 checks):
1. **Authentication** — sign in as QA partner, verify user ID
2. **Timezone Implementation** — getBusinessDate, getProgramDay, getProgramStatus
3. **Lead Trigger Verification** — status updates allowed, column changes rejected, data integrity
4. **Profile Escalation Security** — role change, cross-user update, insert all blocked
5. **RLS — Leads** — own SELECT, other SELECT empty, INSERT/DELETE denied
6. **RLS — Daily Reports** — own SELECT, other SELECT empty, UPDATE/DELETE denied
7. **Announcements & Anonymous Access** — partner SELECT, INSERT denied, all anon queries empty
8. **Profiles & Partners** — own SELECT, other invisible, name update permitted
9. **Audit Tables** — status history and activity log for own context

## 20. Migration 008 — Company ID Volatility Fix (Phase 5 Defect Fix)

*Added 2026-07-14*

### Background
During human browser acceptance testing, `/admin/partners/create` displayed "Failed to generate Company ID". The `generate_company_id()` function was declared `STABLE` but calls `nextval()` which is VOLATILE.

### Root Cause
PostgREST executes STABLE functions inside a **read-only transaction**. When `nextval()` attempts to advance the sequence, PostgreSQL raises:

```
cannot execute nextval() in a read-only transaction (error 25006)
```

### Fix
Migration 008 changed the function declaration from `LANGUAGE sql STABLE` to `LANGUAGE sql VOLATILE`:

```sql
CREATE OR REPLACE FUNCTION public.generate_company_id()
RETURNS text
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT 'RP-' || nextval('public.company_id_seq')::text;
$$;
```

### Security Implications
- **SECURITY DEFINER preserved** — function runs as owner, so callers (including `anon`) can generate Company IDs without direct sequence access
- **All roles retain EXECUTE privilege** — `anon`, `authenticated`, `service_role` all have GRANT EXECUTE
- **No RLS bypass** — the function only returns a string; it doesn't access any table
- **Sequence gaps are acceptable** — if the transaction after `generate_company_id()` fails (auth user creation, profile upsert, etc.), the consumed sequence value is not reused. This is normal PostgreSQL behavior and does not cause collisions

## 21. Remaining Security Checklist

- [x] Supabase project created with no public registration
- [x] Email confirmation disabled for partner accounts
- [x] RLS verified on all 9 tables (Phase 4 — 40/40 RLS matrix tests passed)
- [x] Profile role escalation prevented (migration 006 — WITH CHECK on profiles_update_own)
- [x] Daily report immutability enforced (migration 005 — removed partner UPDATE policy)
- [x] Strong database password set in Supabase
- [x] No API route that proxies SUPABASE_SECRET_KEY to client
- [x] Resources RLS fixed (migration 007 — added auth.role() check)
- [x] Program timezone implemented (PROGRAM_TIMEZONE with Asia/Kolkata default)
- [x] Hosted QA acceptance script created (`npm run qa:hosted`)
- [x] Manual browser acceptance document created (`docs/qa-acceptance-manual.md`)
- [x] Company ID generation volatility fixed (migration 008 — STABLE→VOLATILE)
- [ ] Supabase Auth rate limiting configured (noted as known limitation)
- [ ] Session timeout configured
- [ ] Content Security Policy headers (Vercel)
- [ ] Vercel environment variables scoped correctly
