# Revenue Partner Data Model — Production-Grade Audit Report

**Date:** 2026-08-02
**Scope:** Database schema, partner lifecycle, delete flow, system accounts, cascade safety, data integrity, scalability, security
**Method:** Manual code review of 9 migrations, 50+ source files, all seed scripts, all server actions, all UI components

---

## Table of Contents

1. [Current Architecture](#1-current-architecture)
2. [Relationship Diagram](#2-relationship-diagram)
3. [Delete Flow Diagram](#3-delete-flow-diagram)
4. [Partner Lifecycle Diagram](#4-partner-lifecycle-diagram)
5. [Problems Found](#5-problems-found)
6. [Risk Level for Each Issue](#6-risk-levels)
7. [Recommended Fixes](#7-recommended-fixes)
8. [Recommended Implementation Order](#8-implementation-order)

---

## 1. Current Architecture

### 1.1 Table Inventory (9 tables)

| Table | Purpose | Rows (est.) | Child Tables |
|-------|---------|-------------|--------------|
| `profiles` | User identity (1:1 with auth.users) | N | partners, leads, announcements, resources |
| `regions` | Geographic lookup | 5 (seeded) | partners |
| `partners` | Partner business entity (1:1 with profiles) | N | leads, daily_reports, partner_activity_log |
| `leads` | Sales leads | 10K+ | lead_status_history |
| `daily_reports` | Partner daily activity reports | N × days | — |
| `announcements` | Admin→partner communications | — | — |
| `resources` | Training materials | — | — |
| `lead_status_history` | Immutable lead audit trail | 10K+ | — |
| `partner_activity_log` | Immutable partner activity audit | N × actions | — |

### 1.2 Technology Stack

- **Database:** PostgreSQL (via Supabase)
- **Auth:** Supabase Auth (auth.users)
- **RLS:** Row Level Security policies on all tables
- **App:** Next.js 14+ App Router with Server Actions
- **Two Supabase clients:**
  - `createClient()` — RLS-bound, uses ANON/PUBLISHABLE key
  - `adminClient` — Bypasses RLS, uses SECRET_KEY
- **Authorization guards:** `requireAdmin()`, `requirePartner()`
- **Validation:** Zod schemas for all server-side inputs

### 1.3 Foreign Key Map

```
auth.users(id)
  └─[CASCADE]──→ profiles(id)
                    ├─[CASCADE]──→ partners(id)
                    │                 ├─[NO ACTION]─→ leads.assigned_to
                    │                 ├─[NO ACTION]─→ daily_reports.partner_id
                    │                 └─[NO ACTION]─→ partner_activity_log.partner_id
                    ├─[NO ACTION]──→ leads.created_by
                    ├─[NO ACTION]──→ announcements.created_by
                    ├─[NO ACTION]──→ resources.created_by
                    └─[NO ACTION]──→ lead_status_history.changed_by

regions(id)
  └─[NO ACTION]──→ partners.region_id

leads(id)
  └─[CASCADE]──→ lead_status_history.lead_id
```

### 1.4 RLS Policy Summary

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| profiles | own OR admin | admin | own (no role change) OR admin | — |
| regions | authenticated | admin | admin | admin |
| partners | own OR admin | admin | admin | admin |
| leads | assigned partner (active) OR admin | admin | partner (status only) OR admin | admin |
| daily_reports | own OR admin | own | admin only | — |
| announcements | authenticated | admin | admin | — |
| resources | active (auth) OR admin | admin | admin | — |
| lead_status_history | assigned partner OR admin | partner OR admin | — (immutable) | — (immutable) |
| partner_activity_log | own OR admin | partner OR admin | — (immutable) | — (immutable) |

### 1.5 Triggers (9 total)

- 7× `update_updated_at()` — auto-set timestamp on UPDATE for: profiles, partners, leads, daily_reports, announcements, resources, regions
- 1× `check_lead_partner_update()` — BEFORE UPDATE on leads: blocks partners from modifying non-status columns
- 1× `handle_new_user()` — AFTER INSERT on auth.users: auto-creates profile row from metadata

---

## 2. Relationship Diagram

```
┌──────────────┐
│  auth.users  │
│──────────────│
│ id (PK)      │──────CASCADE──────┐
│ email        │                   │
└──────────────┘                   │
                                   ▼
┌──────────────┐         ┌──────────────────┐
│   regions    │         │    profiles      │
│──────────────│         │──────────────────│
│ id (PK)      │←NO ACT─│ id (PK, FK→users)│──CASCADE──┐
│ name (UQ)    │         │ email (UQ)       │           │
│ description  │         │ full_name        │           │
└──────────────┘         │ role (CHECK)     │           │
                         │ is_active        │           │
                         └──────────────────┘           │
                                                        │
                         ┌──────────────────┐           │
                         │    partners      │           │
                         │──────────────────│←──CASCADE──┘
                         │ id (PK, FK→prof) │
                         │ company_id (UQ)  │
                         │ region_id (FK→rg)│──NO ACT──→ regions
                         │ phone            │
                         │ status (CHECK)   │
                         │ program_start_dt │
                         └────────┬─────────┘
                                  │
              ┌───────────────────┼───────────────────────┐
              │ NO ACTION         │ NO ACTION              │ NO ACTION
              ▼                   ▼                        ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────────┐
│      leads       │  │  daily_reports   │  │ partner_activity_log │
│──────────────────│  │──────────────────│  │──────────────────────│
│ id (PK)          │  │ id (PK)          │  │ id (PK)              │
│ assigned_to (FK) │  │ partner_id (FK)  │  │ partner_id (FK)      │
│ created_by (FK)  │  │ report_date (UQ) │  │ action               │
│ company_name     │  │ leads_contacted  │  │ details (JSONB)      │
│ status (CHECK)   │  │ appointments_bkd │  └──────────────────────┘
│ state (NEW)      │  │ deals_closed     │
│ city (NEW)       │  └──────────────────┘
└────────┬─────────┘
         │ CASCADE
         ▼
┌──────────────────────┐
│ lead_status_history  │
│──────────────────────│
│ id (PK)              │
│ lead_id (FK→leads)   │──CASCADE on lead delete
│ changed_by (FK→prof) │──NO ACTION
│ old_status, new_status│
│ changed_at           │
└──────────────────────┘

NOT SHOWN (no table, computed at runtime):
┌──────────────────┐
│   compliance     │  ← Pure computation over daily_reports
│   (lib/compliance)│    No database table
└──────────────────┘
```

---

## 3. Delete Flow Diagram

### 3.1 Current deletePartner() Flow (admin.ts)

```
Admin clicks "Delete Partner" in UI
  │
  ▼
deletePartnerAction (server action in actions.ts)
  │
  ├─ 1. requireAdmin() → verifies session + admin role + active
  │
  ├─ 2. DeletePartnerSchema.safeParse({ partnerId })
  │     └─ Validates UUID format
  │
  ├─ 3. deletePartner(partnerId) → admin.ts
  │     │
  │     ├─ adminClient.from('partners').select('*, profiles(*), regions(*)')
  │     │   └─ Fetches partner with profile + region
  │     │
  │     ├─ ❌ BUG: PROTECTED EMAIL CHECK
  │     │   ├─ if (PROTECTED_EMAILS.has(profile.email))  → "system account"
  │     │   └─ if (profile.email.endsWith("@rp.irtiqa.internal"))  → "system account"
  │     │       └─ ⚠️ ALL partners have this domain → ALL BLOCKED
  │     │
  │     ├─ 4. Delete daily_reports WHERE partner_id = partnerId
  │     ├─ 5. Delete partner_activity_log WHERE partner_id = partnerId
  │     ├─ 6. Update leads SET assigned_to = NULL WHERE assigned_to = partnerId
  │     ├─ 7. Delete lead_status_history WHERE lead_id IN (orphaned leads)
  │     ├─ 8. Delete partners WHERE id = partnerId
  │     ├─ 9. Delete profiles WHERE id = partnerId
  │     └─ 10. adminClient.auth.admin.deleteUser(partnerId)
  │
  ├─ 4. revalidatePath("/admin/partners")
  │
  └─ 5. Return result to client
        │
        ├─ Success → toast + router.push("/admin/partners")
        └─ Error → display error message in dialog
```

### 3.2 ❌ THE CRITICAL BUG

```
createPartner() in admin.ts, line ~206:
  const authEmail = `${companyId.toLowerCase()}@rp.irtiqa.internal`;

Every partner's auth email is: {company_id}@rp.irtiqa.internal

deletePartner() in admin.ts, line ~444-452:
  if (
    PROTECTED_EMAILS.has(profile.email) ||          // Only catches "admin@rp.irtiqa.internal"
    profile.email.endsWith("@rp.irtiqa.internal")  // CATCHES ALL PARTNERS
  ) {
    return { success: false, error: "This account..." };
  }

Result: deletePartner() ALWAYS returns an error for EVERY partner.
The delete feature is completely non-functional.
```

### 3.3 What SHOULD Happen

```
The intent of the protected-email check was:
  ✓ Block deletion of admin accounts (admin@rp.irtiqa.internal)
  ✓ Block deletion of any account with a REAL @rp.irtiqa.internal email

The bug is that ALL partner emails use the SAME synthetic domain,
so the `endsWith` check incorrectly blocks every partner.

Correct behavior should be:
  - Only protect the specific admin email(s)
  - Allow deletion of partner accounts (whose emails are synthetic)
```

---

## 4. Partner Lifecycle Diagram

### 4.1 Complete Lifecycle

```
                    ┌─────────────────────┐
                    │    Admin creates     │
                    │      partner         │
                    └──────────┬──────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  CREATE PHASE (createPartner in admin.ts)                    │
│                                                              │
│  1. requireAdmin()                                           │
│  2. Validate input (CreatePartnerSchema)                     │
│  3. Generate company_id from sequence (RP-NNNN)              │
│  4. Generate temporary password (16 chars, mixed)            │
│  5. Create auth user:                                        │
│     adminClient.auth.admin.createUser({                      │
│       email: {company_id}@rp.irtiqa.internal,                │
│       password: tempPassword,                                │
│       email_confirm: true,                                   │
│       user_metadata: { full_name, company_id, role: 'partner' } │
│     })                                                       │
│  6. INSERT into partners: company_id, region_id, phone,      │
│     status='active', program_start_date                      │
│  7. Auto-trigger: handle_new_user() creates profile row      │
│  8. logAdminActivity('partner_created', { partnerId })       │
│  9. Return { companyId, password }                           │
│                                                              │
│  Tables written: auth.users, profiles (trigger), partners    │
│  Transactions: NONE (3 separate writes)                      │
│  Rollback: NONE (partial state on failure)                   │
└──────────────────────────────────────────────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Status: ACTIVE     │
                    │   (default)          │
                    └──────────┬──────────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  Partner logs in │ │  Submit daily    │ │  Status change   │
│  (last_login_at) │ │  report          │ │  by admin        │
│  (partner login  │ │  (reports table) │ │                  │
│   action)        │ │                  │ │  active↔inactive │
└──────────────────┘ └──────────────────┘ │  ↔suspended      │
                                          └──────────────────┘
            │                  │                  │
            ▼                  ▼                  ▼
┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
│  Leads assigned  │ │  Activity log    │ │  Password reset  │
│  (leads table)   │ │  entries         │ │  (admin action)  │
│  assigned_to=pId │ │  (activity_log)  │ │                  │
└──────────────────┘ └──────────────────┘ └──────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │    Admin deletes    │
                    │      partner        │
                    └──────────┬──────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  DELETE PHASE (deletePartner in admin.ts)                    │
│                                                              │
│  ❌ BLOCKED: Protected email check prevents ALL deletions    │
│                                                              │
│  INTENDED flow (if bug were fixed):                          │
│  1. requireAdmin()                                           │
│  2. Validate input (DeletePartnerSchema)                     │
│  3. Fetch partner + profile + region                         │
│  4. Check protected emails (admin only)                      │
│  5. DELETE daily_reports WHERE partner_id = X                 │
│  6. DELETE partner_activity_log WHERE partner_id = X          │
│  7. UPDATE leads SET assigned_to = NULL WHERE assigned_to = X │
│  8. DELETE lead_status_history WHERE lead_id IN (orphans)     │
│  9. DELETE partners WHERE id = X                              │
│  10. DELETE profiles WHERE id = X                             │
│  11. adminClient.auth.admin.deleteUser(X)                     │
│                                                              │
│  Tables affected: 7 (delete 6, update 1)                     │
│  Transactions: NONE (7 sequential operations)                │
│  Rollback: NONE (partial state on failure)                   │
└──────────────────────────────────────────────────────────────┘
```

### 4.2 Lifecycle Step Table

| Step | Table(s) | Operation | Auth Required | Idempotent | Atomic |
|------|----------|-----------|---------------|------------|--------|
| Create partner | auth.users, partners, profiles(trigger) | INSERT × 3 | Admin | No (sequence) | **No** |
| Update status | partners | UPDATE | Admin | Yes | Yes |
| Update region | partners | UPDATE | Admin | Yes | Yes |
| Reset password | auth.users | UPDATE (auth) | Admin | Yes | Yes |
| Login | partners | UPDATE (last_login_at) | Partner | Yes | Yes |
| Submit report | daily_reports | INSERT | Partner | No (unique constraint) | Yes |
| Assign lead | leads | UPDATE (assigned_to) | Admin | Yes | Yes |
| Update lead status | leads, lead_status_history | UPDATE + INSERT | Partner (own leads) / Admin | No | **No** |
| Delete partner | daily_reports, partner_activity_log, leads, lead_status_history, partners, profiles, auth.users | DELETE × 6, UPDATE × 1 | Admin | Partially | **No** |

---

## 5. Problems Found

### Phase 1: Database Audit

#### P1-1: Stale Generated Types — leads table missing state and city
- **File:** `src/types/database.generated.ts`
- **Issue:** Migration `20260731` added `state` and `city` columns to `leads`, but the auto-generated TypeScript types were never regenerated. The types file is out of sync with the actual database schema.
- **Impact:** Any code reading `leads.state` or `leads.city` will get TypeScript errors. Developers may not know these columns exist.
- **Fix:** Run `npx supabase gen types typescript` to regenerate.

#### P1-2: No Database-Level CASCADE on Child Tables
- **Issue:** Of 11 foreign keys in the schema, only 3 specify ON DELETE behavior (2 CASCADE, 1 implicit NO ACTION on the remaining 8). All child references to `partners` and `profiles` use NO ACTION.
- **Impact:** Deleting a partner requires manual cleanup of 6 tables in the correct order. If any step fails, orphan records or FK violations occur.
- **Fix:** See Phase 5 recommendations.

#### P1-3: No `updated_at` Trigger on lead_status_history
- **Note:** This is actually correct — lead_status_history is append-only (no UPDATE/DELETE RLS policies). Not a bug.

### Phase 2: Partner Lifecycle

#### P2-1: No Transactional Atomicity in createPartner()
- **File:** `src/lib/admin.ts`, createPartner function
- **Issue:** `createPartner` performs 3 sequential writes (auth.users INSERT → auto-trigger creates profiles → partners INSERT) without a database transaction. If the partners INSERT fails after auth.users succeeds, you have an orphaned auth user + profile with no partner record.
- **Impact:** **Medium** — Can leave orphaned auth accounts. Manual cleanup required.
- **Fix:** Wrap in a transaction, or add cleanup on failure (delete auth user if partner INSERT fails).

#### P2-2: No Transactional Atomicity in deletePartner()
- **File:** `src/lib/admin.ts`, deletePartner function
- **Issue:** `deletePartner` performs 7 sequential operations (delete daily_reports → delete activity_log → update leads → delete lead_status_history → delete partners → delete profiles → delete auth user) without a transaction.
- **Impact:** **High** — If step 5 (delete partners) succeeds but step 6 (delete profiles) fails, the partner row is gone but the profile and auth user remain as orphans. The profile→partner CASCADE would have already fired, but the auth user→profile cascade is separate.
- **Fix:** Wrap in a Supabase RPC transaction, or reverse the cascade order (delete auth user first, let CASCADE handle profiles and partners).

#### P2-3: No Rollback on Partial Failure
- **Issue:** Neither createPartner nor deletePartner attempts cleanup on partial failure.
- **Impact:** **Medium** — Orphan records require manual intervention.
- **Fix:** Add try/catch with compensating actions.

### Phase 3: Delete Bug Investigation (CRITICAL)

#### P3-1: ❌ CRITICAL — deletePartner() Blocks ALL Partner Deletions
- **File:** `src/lib/admin.ts`, lines 388-390 and 444-452
- **Issue:** The `deletePartner()` function contains this check:
  ```typescript
  const PROTECTED_EMAILS = new Set([
    "admin@rp.irtiqa.internal",
  ]);
  // ...
  if (
    PROTECTED_EMAILS.has(profile.email) ||
    profile.email.endsWith("@rp.irtiqa.internal")  // ← THIS LINE
  ) {
    return { success: false, error: "This is a system account and cannot be deleted." };
  }
  ```
  Since `createPartner()` generates emails as `{company_id}@rp.irtiqa.internal` (line ~206), **every single partner has an email ending in `@rp.irtiqa.internal`**. The `endsWith` check catches ALL of them, making the delete feature **100% non-functional**.
- **Impact:** **CRITICAL** — The entire delete partner feature is broken. No partner can ever be deleted.
- **Fix:** Remove the `endsWith` check. Only use the explicit `PROTECTED_EMAILS` set (which correctly lists only the admin account).

#### P3-2: The Protected Email Set is Incomplete
- **File:** `src/lib/admin.ts`
- **Issue:** `PROTECTED_EMAILS` only contains `"admin@rp.irtiqa.internal"` but the seed script `seed-admin.ts` creates the admin with email `"admin@irtiqa.ai"` (note: NOT `@rp.irtiqa.internal`). So the admin email doesn't even match the protected set.
- **Impact:** **Low** — The `endsWith` check catches it anyway (admin@irtiqa.ai does NOT end with @rp.irtiqa.internal, but the PROTECTED_EMAILS set doesn't match either since the email is `admin@irtiqa.ai` not `admin@rp.irtiqa.internal`). Actually, the admin email `admin@irtiqa.ai` is NOT in PROTECTED_EMAILS and does NOT end with `@rp.irtiqa.internal`, so the admin account is NOT protected at all by this check.
- **Fix:** Add the actual admin email to PROTECTED_EMAILS and remove the `endsWith` catch-all.

#### P3-3: cleanup-demo-data.ts Uses Different Admin Email
- **File:** `src/scripts/cleanup-demo-data.ts`
- **Issue:** Preserves `admin@irtiqa.ai` (not `admin@rp.irtiqa.internal`). This is consistent with seed-admin.ts but inconsistent with the PROTECTED_EMAILS set.
- **Impact:** **Low** — Shows the protected email set was written without checking the actual admin email.

### Phase 4: System Account Audit

#### P4-1: No Single Source of Truth for System Accounts
- **Issue:** System/admin account references are scattered across 4+ files with inconsistent values:
  | File | Email/ID | Purpose |
  |------|----------|---------|
  | `admin.ts` (PROTECTED_EMAILS) | `admin@rp.irtiqa.internal` | Block deletion |
  | `auth.ts` (PARTNER_EMAIL_DOMAIN) | `rp.irtiqa.internal` | Generate partner emails |
  | `seed-admin.ts` | `admin@irtiqa.ai` | Create admin account |
  | `cleanup-demo-data.ts` | `admin@irtiqa.ai` | Preserve admin during cleanup |
  | `seed-qa.ts` | `QA-TEST-001` | QA partner company ID |
- **Impact:** **Medium** — Maintenance hazard. Adding a new system account requires finding all 4+ locations.
- **Fix:** Create a single `SYSTEM_ACCOUNTS` constant in a shared location (e.g., `src/lib/constants.ts`) and import it everywhere.

#### P4-2: Admin Email Domain Mismatch
- **Issue:** The admin uses `@irtiqa.ai` domain while partners use `@rp.irtiqa.internal`. These are different domains, which is intentional but not documented.
- **Impact:** **Low** — Not a bug, but the `endsWith("@rp.irtiqa.internal")` check in deletePartner would NOT catch the real admin email, making it doubly broken.

### Phase 5: Cascade Safety

#### P5-1: leads.assigned_to → partners.id Has NO CASCADE
- **Issue:** When a partner is deleted, leads assigned to that partner must be manually unassigned (SET assigned_to = NULL) before the partner can be deleted.
- **Current handling:** `deletePartner()` does handle this (step 7: `UPDATE leads SET assigned_to = NULL`), but without a transaction.
- **Risk:** If this step fails or is skipped, the partner DELETE will fail with FK violation.
- **Fix:** Consider adding `ON DELETE SET NULL` to the FK definition as a safety net.

#### P5-2: daily_reports.partner_id → partners.id Has NO CASCADE
- **Issue:** Reports must be manually deleted before partner deletion.
- **Current handling:** `deletePartner()` deletes reports first.
- **Risk:** If report deletion fails, partner deletion blocked.
- **Fix:** Consider `ON DELETE CASCADE` — reports are meaningless without their partner.

#### P5-3: partner_activity_log.partner_id → partners.id Has NO CASCADE
- **Issue:** Activity logs must be manually deleted before partner deletion.
- **Current handling:** `deletePartner()` deletes logs first.
- **Risk:** If log deletion fails, partner deletion blocked.
- **Fix:** Consider `ON DELETE CASCADE` — activity logs are meaningless without their partner.

#### P5-4: Correct Cascade Order for Partner Deletion
The current `deletePartner()` function uses this order (which is correct):
```
1. DELETE daily_reports WHERE partner_id = X       (child, no further children)
2. DELETE partner_activity_log WHERE partner_id = X (child, no further children)
3. UPDATE leads SET assigned_to = NULL WHERE assigned_to = X  (unassign, don't delete)
4. DELETE lead_status_history WHERE lead_id IN (orphans)       (grandchild of leads)
5. DELETE partners WHERE id = X                    (parent)
6. DELETE profiles WHERE id = X                    (grandparent, but profile still exists)
7. auth.admin.deleteUser(X)                       (great-grandparent → CASCADE deletes profile)
```
Steps 6-7 are redundant: deleting the auth user would CASCADE delete the profile, which would CASCADE delete the partner. But since we manually delete the partner first (step 5), the profile has no partner child anymore, so profile DELETE succeeds, then auth user DELETE is fine.

**Issue:** The order works but is fragile. If anyone adds a new table referencing partners, they must remember to add it to deletePartner().

#### P5-5: No Handling for leads.created_by on Profile Deletion
- **Issue:** `leads.created_by` references `profiles(id)` with NO ACTION. If you try to delete a profile that created leads, the delete will fail. The `deletePartner()` function does NOT clean up `leads.created_by`.
- **Impact:** **Medium** — If the partner ever created leads as admin and then the partner is deleted... wait, partners can't create leads (RLS only allows admin INSERT). So `created_by` will always be the admin, not the partner. This is safe.
- **Risk:** **Low** — But if the architecture changes to allow partners to create leads, this would become a blocker.

#### P5-6: announcements.created_by and resources.created_by
- **Issue:** Same as P5-5. These reference profiles with NO ACTION. But these are admin-created records, not partner-created, so deleting a partner won't affect them.
- **Risk:** **Low** — Safe for current architecture.

### Phase 6: Data Integrity

#### P6-1: No Race Condition Protection on Partner Deletion
- **Issue:** Two admins could simultaneously attempt to delete the same partner. Both would pass the initial checks, both would attempt cleanup, and one would succeed while the other gets FK violations.
- **Impact:** **Low** — Unlikely with small admin team, but no protection exists.
- **Fix:** Use a database advisory lock or SELECT FOR UPDATE.

#### P6-2: leads.status Has 7 Values But No Cross-Validation
- **Issue:** The `leads.status` CHECK constraint allows 7 values, but the compliance system, daily reports, and UI may not handle all 7 correctly.
- **Impact:** **Low** — Works for current use case.

#### P6-3: No UNIQUE Constraint on daily_reports Beyond (partner_id, report_date)
- **Issue:** This is correct — one report per partner per day. But there's no constraint preventing a partner from submitting a report for a future date.
- **Impact:** **Low** — Could add a CHECK constraint on `report_date <= CURRENT_DATE`.

#### P6-4: No Soft Delete Pattern
- **Issue:** Partners are hard-deleted. All historical data (reports, activity logs) is permanently removed. Analytics on past partner performance becomes impossible.
- **Impact:** **High** — Loss of historical data. Cannot answer "how many leads did partner X close last quarter?" after deletion.
- **Fix:** Consider soft delete (set status = 'deleted', keep all records) instead of hard delete.

#### P6-5: company_id Sequence Gaps After Deletion
- **Issue:** If partner RP-1005 is deleted, the sequence is not reset. The next partner will be RP-1006. Gaps are permanent.
- **Impact:** **Low** — This is normal and expected for sequences. Just noting it.

### Phase 7: Scalability Review

#### P7-1: deletePartner() Makes N+1-ish Queries
- **Issue:** The function makes 7 sequential database calls. With the admin client (bypassing RLS), each is a round-trip.
- **Impact at 10K partners:** **Low** — Deletion is infrequent.
- **Impact at 1M leads per partner:** **Medium** — The `UPDATE leads SET assigned_to = NULL WHERE assigned_to = X` could be slow without proper indexing. `idx_leads_assigned_to` exists, so this should be fast.

#### P7-2: No Pagination in Partner List
- **Issue:** The partner list page loads all partners in a single query.
- **Impact at 10K partners:** **Medium** — Could become slow. But with only ~100-1000 partners expected, this is fine.
- **Fix:** Implement cursor-based pagination when needed.

#### P7-3: lead_status_history Grows Unbounded
- **Issue:** Every lead status change creates a row. With 10K leads and 7 possible statuses, this table could grow to 50K+ rows.
- **Impact:** **Low** — The composite index `(lead_id, changed_at DESC)` makes queries efficient. Consider partitioning if it grows beyond 1M rows.

#### P7-4: partner_activity_log Grows Unbounded
- **Issue:** Every partner action logs a row. Daily logins + report submissions + status changes × number of partners.
- **Impact:** **Low** — Indexes are adequate for current scale.

#### P7-5: No Database Connection Pooling Configuration
- **Issue:** Supabase handles this, but the admin client uses a separate key. If the app scales to many concurrent admin operations, connection limits could be hit.
- **Impact:** **Low** — Supabase handles pooling.

### Phase 8: Security Review

#### P8-1: ✅ Partners Cannot Delete Other Partners
- **Evidence:** `deletePartnerAction` calls `requireAdmin()` first. RLS policies on partners table only allow admin ALL operations.
- **Status:** Secure.

#### P8-2: ✅ Partners Cannot Delete Themselves
- **Evidence:** `requireAdmin()` check in deletePartnerAction prevents partner access.
- **Status:** Secure.

#### P8-3: ✅ Partners Cannot Call Server Actions Directly
- **Evidence:** Server actions call `requireAdmin()` which verifies the session user has `role = 'admin'` and `is_active = true` in the profiles table.
- **Status:** Secure.

#### P8-4: ✅ Partners Cannot Escalate Privileges
- **Evidence:** Migration 006 added WITH CHECK on profiles_update_own that prevents changing the `role` column. Partners can only update their own profile's `full_name` and `phone`.
- **Status:** Secure.

#### P8-5: ⚠️ No Rate Limiting on Server Actions
- **Issue:** There's no rate limiting on `deletePartnerAction` or any other server action. A malicious admin (or compromised admin account) could spam deletions.
- **Impact:** **Low** — Admin-only actions. Rate limiting would be defense-in-depth.

#### P8-6: ⚠️ No CSRF Protection Beyond Next.js Defaults
- **Issue:** Server Actions in Next.js have built-in CSRF protection (Origin header validation). No additional CSRF tokens.
- **Impact:** **Low** — Next.js built-in protection is adequate.

#### P8-7: ✅ Confirmation Dialog Requires Name Typing
- **Evidence:** The `DeletePartnerDialog` requires typing the exact partner name before the delete button becomes enabled.
- **Status:** Good UX safety net. But purely client-side — the server action doesn't verify the name.

#### P8-8: ⚠️ No Audit Trail for Partner Deletion
- **Issue:** `deletePartner()` does NOT call `logAdminActivity()` after successful deletion. The partner and their activity log are deleted, so there's no record that the deletion happened.
- **Impact:** **Medium** — Compliance requirement. After deletion, it's impossible to prove who deleted the partner or when.
- **Fix:** Log the deletion to a separate admin audit table BEFORE deleting the partner's activity log, or use a separate audit table not tied to the partner.

#### P8-9: ⚠️ adminClient Bypasses RLS Entirely
- **Issue:** The `adminClient` uses `SUPABASE_SECRET_KEY` which bypasses ALL RLS policies. Any code using `adminClient` can read/write any row in any table.
- **Impact:** **Low** — This is by design for admin operations. But it means any bug in server-side code using adminClient has no database-level safety net.
- **Status:** Acceptable for current architecture.

#### P8-10: ⚠️ No Input Sanitization on partner_activity_log.details (JSONB)
- **Issue:** The `details` column is JSONB and accepts any JSON structure. No validation on the shape of the JSON.
- **Impact:** **Low** — It's an audit log, not user-facing. But inconsistent data could make log queries unreliable.

---

## 6. Risk Levels

| ID | Issue | Severity | Likelihood | Overall Risk | Category |
|----|-------|----------|------------|--------------|----------|
| **P3-1** | ❌ deletePartner() blocks ALL deletions | **CRITICAL** | **Already broken** | **CRITICAL** | Bug |
| **P8-8** | No audit trail for partner deletion | **HIGH** | Certain | **HIGH** | Security/Compliance |
| **P6-4** | No soft delete — permanent data loss | **HIGH** | Certain on deletion | **HIGH** | Data Integrity |
| **P2-2** | No transaction in deletePartner() | **HIGH** | Medium | **MEDIUM** | Reliability |
| **P2-1** | No transaction in createPartner() | **MEDIUM** | Low | **MEDIUM** | Reliability |
| **P4-1** | No single source of truth for system accounts | **MEDIUM** | Certain (maintenance) | **MEDIUM** | Maintainability |
| **P1-1** | Stale generated types (leads missing state/city) | **MEDIUM** | Certain | **MEDIUM** | Code Quality |
| **P5-1/2/3** | No CASCADE on child tables | **MEDIUM** | Medium (manual order) | **LOW** | Schema Design |
| **P3-2** | Protected email set incomplete | **LOW** | N/A (masked by P3-1) | **LOW** | Bug |
| **P6-1** | No race condition protection | **LOW** | Very Low | **LOW** | Concurrency |
| **P7-1** | N+1 queries in deletePartner() | **LOW** | Low (infrequent) | **LOW** | Performance |
| **P8-5** | No rate limiting on server actions | **LOW** | Very Low | **LOW** | Security |

---

## 7. Recommended Fixes

### Fix 1: Fix the Delete Bug (P3-1) — CRITICAL
**File:** `src/lib/admin.ts`
**Change:** Remove the `profile.email.endsWith("@rp.irtiqa.internal")` check from `deletePartner()`. Replace with explicit PROTECTED_EMAILS check using the actual admin email.

```typescript
const PROTECTED_EMAILS = new Set([
  "admin@irtiqa.ai",  // Actual admin email from seed-admin.ts
]);

// In deletePartner():
if (PROTECTED_EMAILS.has(profile.email)) {
  return { success: false, error: "This is a system account and cannot be deleted." };
}
```

### Fix 2: Add Audit Trail for Deletions (P8-8) — HIGH
**File:** `src/lib/admin.ts`
**Change:** Create a separate `admin_audit_log` table (not owned by partners) and log deletion events before performing the delete. Or, log to a server-side file/syslog.

```sql
CREATE TABLE admin_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Fix 3: Add Transaction to deletePartner() (P2-2) — MEDIUM
**File:** `src/lib/admin.ts`
**Change:** Use a Supabase RPC to wrap all delete operations in a single database transaction.

```sql
CREATE OR REPLACE FUNCTION delete_partner_transaction(p_partner_id UUID)
RETURNS void AS $$
BEGIN
  DELETE FROM daily_reports WHERE partner_id = p_partner_id;
  DELETE FROM partner_activity_log WHERE partner_id = p_partner_id;
  UPDATE leads SET assigned_to = NULL WHERE assigned_to = p_partner_id;
  -- lead_status_history cascades from leads if we delete unassigned leads
  DELETE FROM partners WHERE id = p_partner_id;
  -- profiles cascade from auth.users deletion
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Fix 4: Create System Accounts Constant (P4-1) — MEDIUM
**File:** Create `src/lib/constants.ts`
**Change:** Single source of truth for all system account references.

```typescript
export const SYSTEM_ACCOUNTS = {
  ADMIN_EMAIL: "admin@irtiqa.ai",
  ADMIN_COMPANY_ID: null, // Admin doesn't have one
  QA_COMPANY_ID: "QA-TEST-001",
} as const;

export const PARTNER_EMAIL_DOMAIN = "rp.irtiqa.internal";
```

### Fix 5: Regenerate Types (P1-1) — MEDIUM
**Command:** `npx supabase gen types typescript > src/types/database.generated.ts`
**Change:** Sync generated types with actual database schema.

### Fix 6: Consider Soft Delete (P6-4) — LOW (design decision)
**Files:** partners table, deletePartner(), UI
**Change:** Instead of hard-deleting, set `status = 'archived'` and add a soft-delete flag. Keep all historical records. Only the auth user should be deleted (to free the email).

**Trade-off:** Soft delete is more complex but preserves data. Hard delete is simpler but loses history. For an MVP, hard delete with audit logging is acceptable.

### Fix 7: Add ON DELETE CASCADE to Child Tables (P5-1/2/3) — LOW
**Files:** Migration file
**Change:** Add database-level cascade rules so the database handles cleanup automatically:
```sql
ALTER TABLE daily_reports ADD CONSTRAINT daily_reports_partner_id_fkey
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;

ALTER TABLE partner_activity_log ADD CONSTRAINT partner_activity_log_partner_id_fkey
  FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE CASCADE;

ALTER TABLE leads ADD CONSTRAINT leads_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES partners(id) ON DELETE SET NULL;
```
**Trade-off:** Database-level cascade is safer but harder to audit. Application-level cleanup (current approach) gives more control but is error-prone.

---

## 8. Recommended Implementation Order

### Priority 1: Fix the Critical Bug (Must do now)
1. **Fix P3-1:** Remove the `endsWith("@rp.irtiqa.internal")` check from `deletePartner()`. Replace with explicit `PROTECTED_EMAILS` using actual admin email.
2. **Fix P3-2:** Update `PROTECTED_EMAILS` to use the correct admin email (`admin@irtiqa.ai`).
3. **Verify:** Test deletion of a real partner end-to-end.

### Priority 2: Add Safety Nets (Should do soon)
4. **Fix P8-8:** Add audit logging for partner deletion. Create `admin_audit_log` table.
5. **Fix P2-2:** Wrap `deletePartner()` in a database transaction or RPC.
6. **Fix P2-1:** Add error handling/cleanup to `createPartner()` on partial failure.

### Priority 3: Improve Maintainability (Do next sprint)
7. **Fix P4-1:** Create `src/lib/constants.ts` with single source of truth for system accounts.
8. **Fix P1-1:** Regenerate TypeScript types to match actual database schema.
9. **Fix P5-1/2/3:** Add ON DELETE CASCADE/SET NULL to child table FKs.

### Priority 4: Design Improvements (Do when scaling)
10. **Fix P6-4:** Evaluate soft delete vs hard delete based on business requirements.
11. **Fix P6-1:** Add optimistic locking for concurrent admin operations.
12. **Fix P7-2:** Add pagination to partner list when exceeding ~500 partners.

---

## Appendix A: All Files Referenced

### Database
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_security_fixes.sql`
- `supabase/migrations/004_program_start_date.sql`
- `supabase/migrations/005_remove_partner_report_update.sql`
- `supabase/migrations/006_fix_profile_role_escalation.sql`
- `supabase/migrations/007_fix_resources_rls.sql`
- `supabase/migrations/008_fix_company_id_volatility.sql`
- `supabase/migrations/20260713131802_company_id_sequence.sql`
- `supabase/migrations/20260731_add_state_city_to_leads.sql`
- `src/types/database.generated.ts`
- `src/types/database.ts`

### Backend
- `src/lib/admin.ts` — Core business logic (contains the bug)
- `src/lib/auth.ts` — Auth utilities, synthetic email pattern
- `src/lib/partner.ts` — Partner authorization
- `src/lib/supabase/server.ts` — RLS-bound client
- `src/lib/supabase/admin.ts` — Admin client (bypasses RLS)
- `src/app/(dashboard)/admin/partners/actions.ts` — Server actions

### Frontend
- `src/app/(dashboard)/admin/partners/[id]/partner-detail.tsx` — Partner detail page
- `src/app/(dashboard)/admin/partners/partner-table.tsx` — Partner list
- `src/app/(dashboard)/admin/partners/delete-partner-dialog.tsx` — Delete dialog

### Scripts
- `src/scripts/seed-admin.ts` — Admin seed
- `src/scripts/seed-qa.ts` — QA test partner seed
- `src/scripts/cleanup-demo-data.ts` — Demo data cleanup

### Tests
- `src/lib/admin.test.ts` — Schema and utility tests

---

*Report generated by automated audit. All findings are based on code review, not runtime testing.*
