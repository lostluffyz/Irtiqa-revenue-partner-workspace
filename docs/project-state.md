# Project State

**Date:** 2026-07-14
**Project:** Revenue Partner Workspace (Irtiqa AI)

---

## Current State

**Phase 2 — Admin Workspace is complete.**
**Phase 3 — Partner Workspace is complete.**
**Phase 4 — Hosted QA, Security Regression, and Product Acceptance is complete.**
**Phase 5 — Pre-Deployment Hardening and Acceptance is complete.** See [qa-acceptance-report.md](./qa-acceptance-report.md) for full results.
**Phase 5 — Post-QA Fix — Company ID generation defect (migration 008) fixed.** `generate_company_id()` was declared `STABLE` causing PostgREST to execute it in a read-only transaction; `nextval()` cannot run in read-only. Changed to `VOLATILE`.

**Deployment-Readiness Audit (2026-07-14):** Complete 8-phase audit performed. One deployment blocker found and fixed (TypeScript errors in `test-partner-password.ts` breaking `npm run build`). All verification suites pass. See [deployment-readiness-report.md](./deployment-readiness-report.md).

**Adaptive CSV Import (2026-07-14):** New flexible CSV import system implemented. Handles real-world CSV variations (different column names, capitalization, punctuation, reordered columns, extra columns) while keeping the canonical lead model stable and the security boundary intact. See [csv-import.md](./csv-import.md).

| Property | Value |
|---|---|
| **Next.js** | 16.2.10 (App Router, Turbopack) |
| **React** | 19.2.4 |
| **TypeScript** | ^5 (strict mode) |
| **Tailwind CSS** | v4 |
| **Supabase CLI** | 2.109.1 (via npm devDependency) |
| **Hosted Supabase** | ✅ Connected and linked (ref: cjhssljcpelomeodspxg) |
| **Migrations applied** | 001, 002, 003, 004, 005, 006, 007, 008 |
| **Admin bootstrap** | ✅ Admin user created (admin@irtiqa.ai, role=admin) |
| **QA fixtures** | ✅ QA partner created (QA-TEST-001) with 8 leads, 3 announcements, 3 resources |
| **Build** | ✅ Production build passes (22 routes) |
| **TypeScript** | ✅ Zero type errors |
| **Lint** | ✅ Zero errors, zero warnings |
| **Tests** | ✅ 198 passing (Vitest) + 12 auth + 40 RLS + 44 hosted QA |

## Dependencies Installed

**Production:**
- `@supabase/supabase-js` ^2.110.2
- `@supabase/ssr` ^0.12.0
- `zod` ^4.4.3
- `lucide-react` ^1.24.0

**Development:**
- `supabase` ^2.109.1 (CLI)
- `tsx` ^4.23.1 (TypeScript execution)
- `vitest` ^4.1.10
- Standard Next.js devDependencies (TypeScript, Tailwind, ESLint, types)

## Database

| Migration | Status | Purpose |
|---|---|---|
| `001_initial_schema.sql` | ✅ Applied | 9 tables, triggers, RLS policies, seed regions |
| `002_security_fixes.sql` | ✅ Applied | 4 security fixes from audit findings |
| `003_company_id_sequence.sql` | ✅ Applied | company_id_seq for RP-NNNN format generation |
| `004_program_start_date.sql` | ✅ Applied | program_start_date DATE NOT NULL on partners |
| `005_remove_partner_report_update.sql` | ✅ Applied | Removed partner UPDATE policy on daily_reports |
| `006_fix_profile_role_escalation.sql` | ✅ Applied | Prevented profile role column change by partner |
| `007_fix_resources_rls.sql` | ✅ Applied | Added auth.role() check to resources SELECT policy |
| `008_fix_company_id_volatility.sql` | ✅ Applied | Changed generate_company_id() from STABLE to VOLATILE (nextval() cannot run in read-only transaction) |

## Authentication System

| Component | Status | Notes |
|---|---|---|
| Company ID normalization | ✅ Implemented | Trim → uppercase |
| Email mapping (`companyId → auth email`) | ✅ Implemented | `{id}@rp.irtiqa.internal` |
| Partner sign-in (`signInWithCompanyId`) | ✅ Implemented | Transforms ID → auth call |
| Admin sign-in (`signInWithEmail`) | ✅ Implemented | Standard email/password |
| Profile retrieval (`getProfile`) | ✅ Implemented | Server-safe, typed |
| Route protection (proxy) | ✅ Implemented | src/proxy.ts — Next.js 16 proxy convention, session + role-based gating |
| Auth utilities tests | ✅ Passing | 10 unit tests |

## QA Verification (Phase 5)

| Test Suite | Result | Details |
|---|---|---|
| Unit Tests (Vitest) | ✅ 198/198 PASS | All existing + 92 CSV import engine tests |
| Authentication Acceptance | ✅ 12/12 PASS | Admin + partner login, JWT role, invalid credentials |
| RLS Adversarial Matrix | ✅ 40/40 PASS | All tables, all CRUD operations, unauthenticated access |
| Lead Trigger Verification | ✅ 6/6 PASS | Non-status column updates all rejected |
| Profile Escalation Regression | ✅ 7/7 PASS | Self-escalation, cross-user, role change all blocked |
| Timezone Implementation | ✅ 24/24 PASS | getBusinessDate, getProgramDay, getProgramStatus |
| Hosted QA Acceptance | ✅ 44/44 PASS | End-to-end automated test against hosted DB (incl. Company ID generation) |
| Security Sweep | ✅ All clean | No committed secrets, .env.local gitignored, no admin client in app code |
| TypeScript | ✅ 0 errors | Full project compiles cleanly |
| Lint | ✅ 0 errors, 0 warnings | Clean across all files including scripts |
| Build | ✅ 22 pages | Production build succeeds |

### Vulnerabilities Found and Fixed

1. **Profile role escalation** — Partner could update own `role` column (migration 006 fix)
2. **Daily report immutability** — Partner could update submitted reports (migration 005 + server action fix)
3. **createPartner() missing program_start_date** — Would fail on NOT NULL constraint (code fix)
4. **Resources visible to anonymous users** — No auth.role() check on resources SELECT policy (migration 007 fix)
5. **Timezone inconsistency** — All date calculations used UTC instead of PROGRAM_TIMEZONE (program-timezone.ts)
6. **Company ID generation failure** — `generate_company_id()` declared `STABLE` but calls `nextval()` (VOLATILE); PostgREST runs STABLE functions in read-only transactions, causing `cannot execute nextval() in a read-only transaction` (migration 008 fix)

## Route Protection

| Route | Protection | Status |
|---|---|---|
| `/login` | Public (redirects authenticated users) | ✅ |
| `/` | Redirect → `/login` | ✅ |
| `/admin/*` | Session + role=admin required | ✅ |
| `/partner/*` | Session + role=partner required | ✅ |
| Wrong role → correct dashboard | Redirect handled in proxy | ✅ |

## Test Coverage

| File | Tests | Status |
|---|---|---|
| `src/lib/auth.test.ts` | 10 | ✅ |
| `src/lib/admin.test.ts` | 50 | ✅ |
| `src/lib/partner.test.ts` | 22 | ✅ |
| `src/lib/program-timezone.test.ts` | 24 | ✅ |
| `src/lib/csv/import-engine.test.ts` | 92 | ✅ |
| **Total** | **198** | **✅** |

## QA Scripts

| Script | Purpose | Coverage |
|---|---|---|
| `src/scripts/seed-qa.ts` | Create/clean QA fixtures | Idempotent, `--clean` support |
| `src/scripts/test-auth.ts` | Authentication acceptance tests | 12 checks |
| `src/scripts/test-rls.ts` | RLS adversarial test matrix | 40 checks + 7 warnings |
| `src/scripts/seed-admin.ts` | Bootstrap admin user | Idempotent |
| `src/scripts/qa-hosted.ts` | Comprehensive hosted QA acceptance (`npm run qa:hosted`) | 44 checks (10 sections) |
| `src/scripts/test-partner-password.ts` | Password create-and-login regression (`npm run qa:password`) | 20 checks (3 sections) |

## Deployment Status

**Deployment: ✅ APPROVED** (pending external prerequisites)

See [deployment-readiness-report.md](./deployment-readiness-report.md) and [qa-acceptance-report.md#12-deployment-blockers](./qa-acceptance-report.md#12-deployment-blockers).

**Prerequisites (external action required):**
- Git repository initialization
- Vercel project creation with environment variables
- Admin user bootstrap on production

## Missing (Requires External Action)

- Git repository initialization
- Vercel deployment
- Complete manual browser workflow tests (admin + partner) — document created in `docs/qa-acceptance-manual.md`

## Risks

| Risk | Severity | Status |
|---|---|---|
| Profile role escalation (profiles_update_own) | 🔴 Critical | FIXED — migration 006 |
| Daily report partner update (reports_update_partner) | 🔴 Critical | FIXED — migration 005 |
| createPartner() missing program_start_date | 🔴 Critical | FIXED — code updated |
| Resources visible to anonymous users | 🟡 Medium | FIXED — migration 007 |
| Timezone handling | 🟡 Low | Implemented — PROGRAM_TIMEZONE env var with Asia/Kolkata default |
| 30-day program window not enforced in DB | 🟡 Low | App-layer only |
| Column-level RLS not implemented | 🟡 Low | App-layer enforcement + database trigger sufficient |
| Auth rate limiting | 🟡 Low | Relies on Supabase Auth built-in |
| Company ID generation volatility | 🔴 Critical | FIXED — migration 008 changed STABLE→VOLATILE |
