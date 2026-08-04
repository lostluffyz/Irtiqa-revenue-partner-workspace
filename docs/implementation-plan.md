# Implementation Plan

**Revenue Partner Workspace — Irtiqa AI**
**Document version:** 1.7
**Last updated:** 2026-07-14 (Phase 5 Post-QA Fix — Company ID generation defect)

---

## Progress Tracker

| Phase | Status | Actual |
|---|---|---|
| Phase 0 — Architecture | ✅ Complete | All docs created, approved |
| Phase 1 — Foundation | ✅ Complete | Next.js, Supabase clients, auth, proxy, login, placeholders |
| Phase 1 — Hardening | ✅ Complete | Proxy migration, API key modernization, Supabase CLI init, security audit |
| Phase 1 — Hosted DB Connection | ✅ Complete | CLI login, project link, migrations applied, admin bootstrapped |
| Phase 2 — Admin Features | ✅ Complete | All 12 admin sections implemented |
| Phase 3 — Partner Features | ✅ Complete | All 6 partner sections implemented |
| Phase 4 — Hosted QA, Security Regression & Acceptance | ✅ Complete | QA fixtures created, auth tested (12/12), RLS matrix passed (40/40), build verified, security sweep clean |
| Phase 5 — Pre-Deployment Hardening & Acceptance | ✅ Complete | 10 sections completed: migration audit, timezone impl, resource RLS fix, lead trigger verification, profile escalation regression, hosted QA script, manual browser doc, security sweep, full verification, docs updated |

---

## Phase 5 Completion Summary (2026-07-14)

### Sections Completed

| Section | Task | Status | Details |
|---|---|---|---|
| A | Migration History Audit | ✅ | All 6 migrations verified with unique sha256 hashes, no rewrites detected |
| B | Program Timezone Implementation | ✅ | program-timezone.ts (24 tests), PROGRAM_TIMEZONE env var, all consumers updated |
| C | Anonymous Resource/Announcement Security | ✅ | Migration 007: added auth.role() check to resources SELECT policy |
| D | Non-status Lead Update Trigger Verification | ✅ | 6 adversarial tests passed — trigger correctly blocks non-status column updates |
| E | Profile Escalation Regression Test | ✅ | 7 attack tests passed — role escalation, cross-user, history forging all blocked |
| F | Hosted QA Acceptance Script | ✅ | `npm run qa:hosted` — 40 checks pass against hosted database |
| G | Manual Browser Acceptance Document | ✅ | docs/qa-acceptance-manual.md — 20 manual test cases |
| H | Final Security Sweep | ✅ | No secrets, passwords, or internal URLs exposed in any file |
| I | Complete Verification | ✅ | 106/106 tests, lint 0 errors, tsc 0 errors, build 22 pages, hosted QA 40/40 |
| K | **Company ID Defect Fix** | ✅ | Migration 008: changed `generate_company_id()` from STABLE→VOLATILE; root cause was PostgREST read-only transaction blocking `nextval()` |
| J | Documentation Update | ✅ | project-state.md, security-model.md, implementation-plan.md, qa-acceptance-report.md updated |

### Files Created in Phase 5 (10 files)

**Timezone:**
- `src/lib/program-timezone.ts` — getBusinessDate(), getProgramDay(), getProgramStatus(), isProgramActive(), formatBusinessDate()
- `src/lib/program-timezone.test.ts` — 24 tests

**Migration:**
- `supabase/migrations/007_fix_resources_rls.sql`
- `supabase/migrations/008_fix_company_id_volatility.sql`

**QA:**
- `src/scripts/qa-hosted.ts` — comprehensive hosted QA acceptance (44 checks, incl. Company ID gen)
- `docs/qa-acceptance-manual.md` — manual browser test checklist

**Docs updated:**
- `docs/project-state.md` — Phase 5 completion, updated counts
- `docs/security-model.md` — timezone, migration 007, hosted QA
- `docs/implementation-plan.md` — Phase 5 tracker
- `docs/qa-acceptance-report.md` — Phase 5 results

**Config:**
- `.env.local.example` — PROGRAM_TIMEZONE added
- `vitest.config.ts` — PROGRAM_TIMEZONE=UTC for deterministic tests
- `package.json` — qa:hosted script added

### Files Modified in Phase 5 (10 files)

**Production code:**
- `src/lib/partner.ts` — PROGRAM_TIMEZONE from env var, delegate to program-timezone.ts
- `src/app/(dashboard)/partner/page.tsx` — use getBusinessDate(PROGRAM_TIMEZONE)
- `src/app/(dashboard)/partner/actions.ts` — use getBusinessDate(PROGRAM_TIMEZONE)
- `src/app/(dashboard)/partner/report/page.tsx` — use getBusinessDate(PROGRAM_TIMEZONE)
- `src/app/(dashboard)/admin/page.tsx` — use getBusinessDate()
- `src/lib/admin.ts` — use getBusinessDate() for program_start_date

**Tests/scripts:**
- `src/lib/partner.test.ts` — updated test for pre-program (negative program day)
- `src/scripts/test-rls.ts` — fixed unused variable lint warning
- `src/scripts/seed-qa.ts` — SupabaseClient type instead of any

---

## Phase 5 — Post-QA Fix: Company ID Generation Defect (2026-07-14)

### Root Cause

`generate_company_id()` was declared `LANGUAGE sql STABLE` but calls `nextval('public.company_id_seq')` which is a VOLATILE operation. PostgREST executes STABLE functions inside a **read-only transaction** for optimization, causing `nextval()` to fail with:

> `cannot execute nextval() in a read-only transaction` (PostgreSQL error 25006)

### Fix

**Migration 008** (`supabase/migrations/008_fix_company_id_volatility.sql`):
- Changed function declaration from `STABLE` to `VOLATILE`
- SECURITY DEFINER and SET search_path preserved
- All roles retain EXECUTE privilege

### Verification

| Check | Result |
|---|---|
| Direct REST API call (`/rest/v1/rpc/generate_company_id`) | ✅ Returns `"RP-NNNN"` format |
| `adminClient.rpc("generate_company_id")` via Supabase JS client | ✅ Returns correct value, no error |
| Repeated calls return unique, incrementing IDs | ✅ RP-1002 → RP-1003 → RP-1004 |
| Hosted QA acceptance | ✅ 44/44 PASS (4 new Company ID tests in Section 9) |
| Unit tests | ✅ 106/106 PASS |
| Lint | ✅ 0 errors |
| TypeScript | ✅ 0 errors |
| Build | ✅ 22 pages |

### Files Created
- `supabase/migrations/008_fix_company_id_volatility.sql` — STABLE → VOLATILE

### Files Modified
- `src/lib/admin.ts` — added `console.error` logging for Company ID RPC failure
- `src/scripts/qa-hosted.ts` — added Section 9: Company ID Generation (4 tests)

---

## Phase 1 Completion Summary (2026-07-13)

### Tasks Completed

| Task | Status | Details |
|---|---|---|
| Next.js initialization | ✅ | 16.2.10, App Router, TypeScript strict, Tailwind v4 |
| Dependencies installed | ✅ | Supabase SSR, zod, lucide-react |
| Supabase CLI | ✅ | 2.109.1 as npm devDependency |
| DB migration 001 | ✅ | Applied to hosted Supabase |
| DB migration 002 (security) | ✅ | Applied to hosted Supabase |
| Supabase browser client | ✅ | src/lib/supabase/client.ts |
| Supabase server client | ✅ | src/lib/supabase/server.ts |
| Supabase admin client | ✅ | src/lib/supabase/admin.ts (runtime guard) |
| Supabase middleware client | ✅ | src/lib/supabase/middleware.ts (proxy cookie helpers) |
| TypeScript types | ✅ | src/types/database.generated.ts (authoritative), src/types/database.ts (aliases preserved) |
| Auth utilities | ✅ | Company ID normalization, email mapping, sign-in, profile |
| Route protection proxy | ✅ | src/proxy.ts — Next.js 16 convention, session + role-based gating |
| Login page | ✅ | Partner mode (Company ID + password) + Admin mode (email + password) |
| Admin placeholder | ✅ | Replaced by Phase 2 full workspace |
| Partner placeholder | ✅ | Protected, shows profile + company ID + status, sign-out |
| Admin bootstrap script | ✅ | src/scripts/seed-admin.ts (idempotent) |
| Auth utility tests | ✅ | 10 unit tests passing |
| ESLint | ✅ | Zero warnings |
| TypeScript check | ✅ | Zero errors |
| Production build | ✅ | Passes |
| Hosted Supabase connection | ✅ | CLI linked, migrations 001+002 applied, 9 tables + RLS verified |
| Admin bootstrap | ✅ | Admin user created (admin@irtiqa.ai), role=admin verified |
| Generated DB types | ✅ | database.generated.ts from linked project |

---

## Phase 3 — Partner Workspace (2026-07-13)

### Implemented Features

| Section | Feature | Status |
|---|---|---|
| A. Partner Shell | Collapsible sidebar with 6 items, mobile hamburger, sign-out | ✅ |
| B. Partner Authorization | requirePartner() with profile + partner checks | ✅ |
| C. Partner Dashboard | Identity display, program day, progress bar, stats, today's tasks | ✅ |
| D. Lead Center | List, search, status filter, pagination (50/page), inline status update | ✅ |
| E. Daily Report | One-submission form, editable today, Zod validation, activity logging | ✅ |
| F. Progress | Program day, streak, lead breakdown, performance totals | ✅ |
| G. Resources | Read-only, active only, grouped by type, card grid | ✅ |
| H. Announcements | Read-only, pinned respected, date formatting | ✅ |
| I. Date/Time Utilities | getProgramDay(), calculateStreak(), PROGRAM_TIMEZONE | ✅ |
| J. Activity/Audit | Lead status history + activity log on partner actions | ✅ |
| K. Loading/Error/Empty | EmptyState on all pages, error handling on actions | ✅ |
| L. Security | requirePartner() on all server actions + pages, Zod on all inputs | ✅ |
| M. Partner Tests | 22 tests (program day, schemas) | ✅ |
| N. Documentation | Project state + implementation plan updated | ✅ |

### Security Controls (Phase 3)

| Control | Implementation | Status |
|---|---|---|
| Partner authorization gate | `requirePartner()` on every server action and page | ✅ |
| Zod validation | LeadStatusUpdateSchema, DailyReportSchema | ✅ |
| One-submission-only | DB UNIQUE(partner_id, report_date) + RLS date restriction | ✅ |
| Anti-exfiltration | Pagination, no bulk export, no select-all | ✅ |
| Activity logging | Lead status changes + daily reports logged | ✅ |
| No privileged client | Partner uses publishable key (RLS-bound) only | ✅ |
| Program day database | Migration 004 adds program_start_date column | ✅ |

### Tasks Completed

| Task | Status | Details |
|---|---|---|
| Migration 004 | ✅ | program_start_date column + backfill for existing partners |
| requirePartner() | ✅ | Authorization gate in src/lib/partner.ts |
| Date/time utilities | ✅ | getProgramDay(), calculateStreak(), PROGRAM_TIMEZONE |
| Partner shell layout | ✅ | Collapsible sidebar, mobile hamburger, 6 nav items |
| Partner layout | ✅ | Profile check + PartnerShell wrapper |
| Partner server actions | ✅ | updateLeadStatusAction, submitDailyReportAction |
| Partner dashboard | ✅ | Identity, stats, progress bar, announcements |
| Lead center | ✅ | Search, filter, pagination, inline status update |
| Daily report | ✅ | Form, update existing, activity logging |
| Progress page | ✅ | Streak, lead breakdown, performance totals |
| Resources page | ✅ | Read-only, grouped by type, card grid |
| Announcements page | ✅ | Read-only, pinned respected |
| Partner tests | ✅ | 22 tests for getProgramDay, Zod schemas |
| Build verification | ✅ | tsc --noEmit, npm run build, npm run lint, npm test |

### Files Created in Phase 3 (14 files)

**Core:**
- `src/lib/partner.ts` — requirePartner(), getProgramDay(), calculateStreak(), Zod schemas, logPartnerActivity()
- `src/lib/partner.test.ts` — 22 tests

**Migration:**
- `supabase/migrations/004_program_start_date.sql`

**Layout:**
- `src/components/layout/partner-shell.tsx`
- `src/app/(dashboard)/partner/layout.tsx` (updated)

**Server Actions:**
- `src/app/(dashboard)/partner/actions.ts` — lead status update + daily report submission

**Partner pages:**
- `src/app/(dashboard)/partner/page.tsx` — Dashboard (rewritten from placeholder)
- `src/app/(dashboard)/partner/leads/page.tsx` — Lead Center
- `src/app/(dashboard)/partner/leads/lead-status-update.tsx` — Status update component
- `src/app/(dashboard)/partner/report/page.tsx` — Daily Report
- `src/app/(dashboard)/partner/report/daily-report-form.tsx` — Report form component
- `src/app/(dashboard)/partner/progress/page.tsx` — Progress
- `src/app/(dashboard)/partner/resources/page.tsx` — Resources
- `src/app/(dashboard)/partner/announcements/page.tsx` — Announcements

### Implemented Features

| Section | Feature | Status |
|---|---|---|
| A. Admin Shell | Collapsible sidebar with 7 items, mobile hamburger, sign-out | ✅ |
| B. Dashboard | 7 stat cards, recent reports/activity/announcements | ✅ |
| C. Partner Management | List, create, inline password reset/status/region | ✅ |
| D. Lead Management | List, filter, pagination, bulk assign (500 max) | ✅ |
| E. CSV Upload | Manual parser, 5MB/5000 row limits, batch insert | ✅ |
| F. Daily Reports | Partner filter, date range, 200 report limit | ✅ |
| G. Activity Log | Relative timestamps, humanized actions | ✅ |
| H. Announcements CRUD | Create/edit/delete, pin, confirm dialog | ✅ |
| I. Resources CRUD | Create/edit/delete, card grid, type badges | ✅ |

### Security Implementation

| Control | Implementation | Status |
|---|---|---|
| Admin authorization gate | `requireAdmin()` on every server action | ✅ |
| Zod validation | All mutation inputs validated | ✅ |
| Service role isolation | `adminClient` only after authz | ✅ |
| Password security | Reset via admin API, never logged | ✅ |
| CSV upload safety | Cannot set `assigned_to`, batch limits | ✅ |
| Partner creation safety | Cannot set `role=admin` | ✅ |
| Lead assignment safety | Validates partner is active | ✅ |
| Company ID generation | DB sequence, not client-controlled | ✅ |

### Test Coverage Added

| File | Tests | Coverage |
|---|---|---|
| `src/lib/admin.test.ts` | 50 | All Zod schemas, CSV validation, password generation |

### Tasks Completed

| Task | Status | Details |
|---|---|---|
| UI primitives | ✅ | Button, Input, Select, Card, Badge, Table, EmptyState, FormError |
| Admin shell layout | ✅ | Sidebar nav with 7 sections, responsive |
| Admin layout | ✅ | Profile validation + redirect + AdminShell |
| Dashboard | ✅ | Stats, recent reports/activity/announcements |
| Partner list page | ✅ | Search, filter, inline actions |
| Partner create page | ✅ | Form + one-time credential display |
| Partner server actions | ✅ | Create, reset password, update status, update region + requireAdmin calls |
| Lead list page | ✅ | Search, filter, pagination (50/page) |
| Lead bulk assign UI | ✅ | Checkbox select, partner dropdown, bulk action |
| Lead CSV upload page | ✅ | File picker, validation, batch insert |
| Lead server actions | ✅ | assignLeadsAction, uploadCsvAction |
| Reports page | ✅ | Partner filter, date range, 200 limit |
| Activity page | ✅ | Relative timestamps, humanized actions |
| Announcements list page | ✅ | Pin badges, edit/delete per card |
| Announcements create/edit | ✅ | Forms with server actions |
| Announcements server actions | ✅ | Create, update, delete |
| Resources list page | ✅ | Card grid, type badges, edit/delete |
| Resources create/edit | ✅ | Forms with server actions |
| Resources server actions | ✅ | Create, update, delete |
| Migration 003 | ✅ | company_id_seq for partner ID generation |
| Build verification | ✅ | tsc --noEmit, npm run build, npm run lint, npm test |

### Files Created in Phase 2 (40+)

**Admin core:** `src/lib/admin.ts`, `src/lib/admin.test.ts`

**UI components:** `src/components/ui/button.tsx`, `input.tsx`, `select.tsx`, `card.tsx`, `badge.tsx`, `table.tsx`, `empty-state.tsx`, `form-error.tsx`

**Layout:** `src/components/layout/admin-shell.tsx`

**Admin pages:**
- `src/app/(dashboard)/admin/layout.tsx` (updated)
- `src/app/(dashboard)/admin/page.tsx` (rewritten)
- `src/app/(dashboard)/admin/partners/page.tsx`, `partner-actions.tsx`, `actions.ts`, `create/page.tsx`
- `src/app/(dashboard)/admin/leads/page.tsx`, `lead-bulk-assign.tsx`, `actions.ts`, `upload/page.tsx`
- `src/app/(dashboard)/admin/reports/page.tsx`
- `src/app/(dashboard)/admin/activity/page.tsx`
- `src/app/(dashboard)/admin/announcements/page.tsx`, `announcement-actions.tsx`, `actions.ts`, `new/page.tsx`, `edit/[id]/page.tsx`, `edit/[id]/edit-form.tsx`
- `src/app/(dashboard)/admin/resources/page.tsx`, `resource-actions.tsx`, `actions.ts`, `new/page.tsx`, `edit/[id]/page.tsx`, `edit/[id]/edit-form.tsx`

---

## Phase 3 Completion Criteria Met

- [x] Partner authorization gate (`requirePartner()`)
- [x] Partner shell with 6-item navigation sidebar
- [x] Partner dashboard (identity, program day, progress bar, stats, announcements)
- [x] Lead center (list, filter, pagination, inline status update)
- [x] Daily report submission (one-submission, editable today)
- [x] Progress page (streak, lead breakdown, performance totals)
- [x] Resources view (read-only, grouped by type)
- [x] Announcements view (read-only, pinned respected)
- [x] requirePartner() authorization on all mutations
- [x] Zod validation on all inputs (LeadStatusUpdateSchema, DailyReportSchema)
- [x] Program day calculation and streak tracking utilities
- [x] Migration 004 for program_start_date
- [x] Date/time utilities (PROGRAM_TIMEZONE, getProgramDay, calculateStreak)
- [x] Activity logging for partner actions
- [x] TypeScript zero errors
- [x] ESLint zero warnings
- [x] Production build successful (22 routes)
- [x] 22 partner unit tests added
- [x] All 82 tests passing

---

## Remaining Phases

### Phase 4 — Ship (~4 hours)
- Testing (end-to-end, security)
- Git init + GitHub connection
- Vercel deployment
- Production admin seed
- Documentation finalization

---

## Risk Register (Updated)

| # | Risk | Impact | Likelihood | Status |
|---|---|---|---|---|
| 1 | Supabase project not yet created | Blocking | **Resolved** | Hosted project linked and bootstrapped |
| 2 | Next.js 16 proxy convention | Low | Certain | Successfully migrated to proxy.ts; no warning |
| 3 | `server-only` package incompatible with Turbopack | Medium | Resolved | Removed package; replaced with runtime guard |
| 4 | Database generic type inference fails with supabase-js v2 | Medium | Resolved | Removed generic from client creation; generated types in separate file |
| 5 | Scope creep | High | Medium | Strict boundary documented |
