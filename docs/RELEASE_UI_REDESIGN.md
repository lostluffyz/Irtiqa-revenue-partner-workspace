# Release: UI Redesign (Phases 1–12) — Readiness Report

> Generated 2026-10-09 from a READ-ONLY audit of branch `ui/phase-12-reports`
> (16 commits ahead of `main` @ `562351c`). No code was changed for this report.

## 1. Summary

This release is a display-layer redesign of the Irtiqa Revenue Partner Workspace
(Next.js + Supabase): floating admin/partner sidebar + sticky top bar, redesigned
admin lists (Leads, Partners, Allocation, Scraper, Reports, Announcements,
Resources), partner mobile-first pages (Dashboard, My Leads + drawer, Daily Report
steppers, Progress, tab bar + More menu), shared confirm dialogs for destructive/
irreversible actions, and a timezone-safe greeting/deadline display. Server
actions, queries, RLS/migrations, auth, proxy, env, and dependencies are
untouched — the diff contains **zero** changes under `src/lib/**`, `supabase/**`,
`src/proxy.ts`, configs, or any `actions.ts`. Quality gates pass (vitest 16
files/526 tests ×3 runs, `tsc` clean, eslint 54 errors = pre-existing baseline,
`next build` clean).

## 2. Phase list (`git log --oneline main..HEAD`, oldest first)

| Phase | Commit(s) | Scope |
|---|---|---|
| Dashboard/shell | `6e3f103` UI phase 1 | dashboard, shells, blank-page fix |
| Lists | `b421643` UI phase 2 | leads, partners, mobile dashboard |
| Mobile | `edc8ad3` UI phase 3 | mobile leads/partners |
| Allocation | `ad219f1` UI phases 4-6 (part) | allocation redesign + Run confirm dialog |
| Scraper | `ad219f1` UI phases 4-6 (part) | scraper redesign |
| Safety dialogs | `ad219f1` + `ae3be09` UI 6b | confirm dialogs, scraper table fixes |
| Partner dashboard | `96868de` UI 7, `590476f` UI 7b, `7a67a15` UI 7c | partner dashboard + fixes + polish |
| Partner leads + drawer | `589de0b` UI phase 8 | partner My Leads cards/chips + drawer |
| Report/progress/tab bar | `14feb22` UI 9, `f1f2d5f` UI 9b | daily report steppers + confirm, progress, tab bar, menu fixes |
| Comms pages | `5f3a925` UI phase 10 | announcements/resources pages, drawers, top pad |
| Admin sidebar/topbar | `6c86b44` UI phase 11 | floating `AppSidebar` + sticky `AppTopbar` |
| Partner shell | `ced594b` UI phase 11b | partner adopts floating sidebar + topbar |
| Initials polish | `5bf7581` UI phase 11c | shared `getInitials` (tile "D" → "DJ") |
| Admin reports | `69ced9d` UI phase 12 (tip) | reports filter/tiles/expandable table/mobile cards |

Branch pointers (`git branch --list -vv`): `main` = `562351c` (= `origin/main`);
`ui/phase-1-dashboard`→`6e3f103`, `ui/phase-2-lists`→`b421643`,
`ui/phase-3-mobile`/`ui/phase-4-allocation`/`ui/phase-5-scraper`→`edc8ad3`,
`ui/phase-6-safety`→`ae3be09`, `ui/phase-7-partner`→`7a67a15`,
`ui/phase-8-partner-leads`→`589de0b`, `ui/phase-9-report-progress`→`14feb22`,
`ui/phase-9b-polish`→`f1f2d5f`, `ui/phase-10-comms`→`5f3a925`,
`ui/phase-11-shell`→`6c86b44`, `ui/phase-11b-partner-shell`→`ced594b`,
`ui/phase-11c-polish`→`5bf7581`, `ui/phase-12-reports`→`69ced9d` (tip).
Working tree was clean at audit start — no uncommitted work exists.

## 3. Protected-path proof (`git diff --stat main...HEAD -- <paths>`)

| Group | Result |
|---|---|
| (a) server actions (all 7 `actions.ts` + `docs/security-model.md`) | NO CHANGES |
| (b) `src/lib/**` | NO CHANGES |
| (c) `supabase/**` (migrations/RLS/triggers) | NO CHANGES |
| (d) `src/proxy.ts`, middleware | NO CHANGES |
| (e) `package.json`, `package-lock.json` | NO CHANGES |
| (f) `next.config.*`, `vercel.json`, `tsconfig.json`, `eslint.config.*`, `postcss.config.*`, `vitest.config.*` | NO CHANGES |
| (g) `.env*`, `.gitignore`, `.github/**` | NO CHANGES |
| (h) `src/scripts/**` | NO CHANGES |
| (i) `src/types/**` | NO CHANGES |
| (j) `public/**` | NO CHANGES |

All ten groups are empty — no release blocker here. (`git grep -l "use server" HEAD`
lists the 7 pre-existing `actions.ts` files; none differ from `main`.)

## 4. Behavior-change register

Change | Where (HEAD) | Risk | How to test (read-only) |
|---|---|---|---|
| Start Scrape opens confirm dialog; dead Dry-run checkbox removed (direct Dry Run button instead); validation extracted to `validateScrapeForm` — FormData keys (`query, location, requested_count, extract_emails, dry_run`) and `createScrapeJobAction(null, formData)` byte-identical | `admin/scrape/page.tsx:107-116, 329-352, 574-621` | low | Empty query → inline error, no dialog; valid → dialog lists params → Cancel/confirm |
| Run Allocation opens confirm dialog; Dry Run immediate; `runAllocationAction` payload (`dryRun`) and approve path unchanged | `admin/allocation/page.tsx:101-155, 198-214, 440-485` | low | Dry Run runs at once; Run Allocation shows dialog → Cancel closes |
| Daily Report numbers are −/+ steppers; Submit opens confirm dialog; field names (`leadsContacted, appointmentsBooked, dealsClosed, biggestChallenge, additionalNotes`) and `submitDailyReportAction` call unchanged | `partner/report/daily-report-form.tsx:70-134, 230-246, 461-501` | low | Type/−/+, invalid → native bubble no dialog; valid → dialog echoes numbers → confirm |
| Lead notes gains Saving/Saved/failure+Retry status (`role="alert"`); save call `updateLeadNotesAction(leadId, value)` unchanged | `partner/leads/lead-notes.tsx:7-33, 87-122` | low (visibility) | Edit note → Saving→Saved; forced error → red message + Retry |
| Announcement/resource delete: inline Confirm/Cancel → shared `Dialog`; `deleteAnnouncementAction`/`deleteResourceAction` with same `id` FormData; edit-forms add PageHeader/char-count/switch/radiogroup, same update calls | `announcement-actions.tsx:38-40, 70-89`, `resource-actions.tsx:42-44, 72-91` | low | Delete → modal, Esc/Cancel refocuses, confirm deletes |
| My Leads: native status select → chips (same 8 values), rows → cards, pill pagination; URL contract `?search=&status=&page=` unchanged | `partner/leads/leads-table-wrapper.tsx:330-356, 102-293, 526-567` | medium | Deep-link with params; chip click keeps `search`, drops `status=all` |
| Dashboard pipeline rows are links to `/partner/leads?status=<value>` (+ `not_contacted` nudge) | `partner/mobile/pipeline.tsx:31-40`, `partner/desktop/index.tsx:231-260` | low | Click row → filtered My Leads |
| Admin FAB → open-only button + in-drawer X (`admin-mobile-menu`, Esc, focus return); partner FAB removed → bottom tab bar (4 tabs + More → `partner-mobile-menu`, `inert` tab bar); same collapse state via `--sb-w` 72/252px | `layout/admin-shell.tsx:47-107`, `layout/partner-shell.tsx:45-88, 251-316` | medium | <md: tab bar/More/Esc/focus-back; desktop collapse no jump |
| Greeting + deadline compute viewer-local time after mount (`useSyncExternalStore` null-first-paint; rAF post-paint); SSR output identical, no hydration mismatch | `dashboard/admin/use-admin-greeting.ts`, `dashboard/use-viewer-deadline.tsx` | low | JS off → fallback/program-zone text; on → viewer greeting/zone after paint |
| Floating `AppSidebar` + sticky `AppTopbar` (`sticky top-3 z-[29]`), collapse toggle, rail tooltips; all hrefs/labels/order/routes/sign-out identical | `layout/app-sidebar.tsx`, `layout/app-topbar.tsx:22` | medium | Expand/collapse, pill glide, scroll-under-topbar, reload collapsed |
| Reports: new filter UI (Apply + conditional Clear `Link /admin/reports`), summary tiles, expandable rows/cards; params `partner/from/to` + query filters/order/limit(200) unchanged | `admin/reports/page.tsx:85-198`, `reports-table.tsx` | medium | Filtered URL shows same rows; chevron expands without navigation |
| Sidebar tiles use shared `getInitials` ("D"→"DJ"; admin stays "A"); Announcements empty icon CalendarCheck→Megaphone | `layout/app-sidebar.tsx:348,367`, `ui/avatar.tsx:32`, `admin/announcements/page.tsx:58` | low | Tile matches top-bar avatar initials |
| Two new `target="_blank" rel="noreferrer"` lead-website links (admin lead-table) — `noreferrer` implies `noopener` in modern browsers, but literal `noopener` token absent | `admin/leads/lead-table.tsx:512-513, 667-668` | low | Inspect anchors; follow-up: add `noopener` |
| Diff hygiene | — | — | No new `fetch`, server-action, storage, cookie, `window.open`, `dangerouslySetInnerHTML` (one removed), `console.log/time`, `debugger`, TODO/FIXME, ts-ignore/expect-error, eslint-disable, or `: any` in added lines (verified on `+` lines of the full diff) |

## 5. Quality-gate results (tip, local, nothing modified)

- `npx vitest run` ×3: 16 files / 526 passed every run, zero flakes (runs at
  14:39:32, 14:39:43, 14:41:03).
- `npx tsc --noEmit`: clean (exit 0).
- `npx eslint src/ --quiet`: **54 errors** = baseline; every error in a
  chain-touched file sits on a line unchanged from `main` (verified: scrape
  `fetchJobs`, drawer `setLead`, `triggerRef` render-reads, shell
  `setMounted`/`setMobileOpen`, partners try/catch, dashboard `as any` all
  identical in `main`). Chain added **zero** new lint errors.
- `npm run build`: success, 25/25 static pages, no warnings. Route table: `/`,
  `/_not-found`, `/login` static (○); all 13 admin + 6 partner routes and
  `/api/cron/allocate` dynamic (ƒ); proxy middleware. This Next/Turbopack
  output prints **no per-route First Load JS sizes**, so the 250 kB check
  cannot be read from the build log (no size regressions are inferable —
  no dependencies were added).
- Tests added by the chain: **67** across 7 new files (content-cards 8,
  helpers 27, app-sidebar 15, app-topbar 5, page-transition 3, report-utils 6,
  reports-table 3). Diff totals: **83 files, +6723/−2780** (27 added, 56
  modified, 0 deleted), incl. 12 new `loading.tsx` skeletons.

## 6. Merge options (PowerShell)

**Option A — release branch + ONE PR, merge commit (RECOMMENDED).**
```powershell
git push origin ui/phase-12-reports:release/ui-redesign
# then open ONE PR: release/ui-redesign -> main on GitHub, get Vercel Preview URL, merge with "Create a merge commit"
```
Pros: single review point + Preview deploy; full phase history preserved;
whole release revertible with one `git revert -m 1 <merge-sha>`. Cons: 16-commit
history lands on main (acceptable — it is the audit trail).
**NOTE: previews normally use production env vars → preview talks to the
PRODUCTION database: test read-only (no submits, no deletes).**

**Option B — squash-merge the same PR.**
Pros: one clean commit on main. Cons: loses phase granularity that this audit
references; revert is still one commit but forensics get harder.

**Option C — fast-forward main to the tip. NOT RECOMMENDED.**
No PR, no review checkpoint, no Preview URL; bypasses every control.

**Recommendation: Option A.** It is the only path with a reviewable diff, a
Preview URL, preserved forensics, and a one-command revert.

## 7. Rollback plan

1. Tag first (idempotent — `pre-ui-redesign` already points at `main`'s tip
   `562351c`, verified): `git tag pre-ui-redesign main` (only if missing) and
   `git push origin pre-ui-redesign`.
2. Primary rollback: **Vercel dashboard → Deployments → promote the previous
   production deployment** (instant, no code change).
3. Git fallback: `git revert -m 1 <merge-sha>` (merge commit from Option A),
   or `git reset --hard pre-ui-redesign` only on an unshared branch — never on
   `main` after push.
4. **This release contains NO database migrations** (Step 3: `supabase/**`
   empty), so rollback is code-only and cannot desync the database.

## 8. Checklists (READ-ONLY: look, navigate, Cancel — never submit/save/delete)

Pre-merge: [ ] chain tip = `69ced9d`, tree clean; [ ] `merge-base main HEAD`
= `main` tip (no drift); [ ] gates re-run green; [ ] preview opened with
production-env caution acknowledged.
Post-deploy smoke — admin desktop: login → each nav item renders → open a lead
drawer, close without saving → Daily Reports: set filters, Apply, Clear →
Allocation + Scraper: open each confirm, press Cancel → expand/collapse a
report row. Partner desktop: dashboard → My Leads (chips, cards, pagination) →
open lead drawer, close → Daily Report page opens, Submit dialog Cancels →
Progress/Announcements/Resources render. Phone: partner tab bar + More drawer
(X/overlay/Esc), admin drawer, no horizontal scroll at 360–430px.

## 9. Known open issues NOT fixed by this release

1. Partner notes autosave is rejected by the DB trigger (`internal_notes`) —
   partners now SEE the failure + Retry message until the database fix ships.
2. Partner stat tiles (Contacted/Follow-up/Appointments) count the current
   page of 50 leads only.
3. "Last Active: Never" — nothing writes `last_login_at`.
4. Dashboard Recent Activity lacks the partner name.
5. Sidebar collapse state is not persisted across reloads.
6. No Unassigned quick-filter chip on admin Leads.
7. Unredesigned pages remain: admin Activity, Partner detail/create, Upload CSV.
8. Dark mode not started (token audit only).
9. Two admin lead-website links use `rel="noreferrer"` without the literal
   `noopener` token (modern browsers imply it; tidy-up follow-up).

## 10. Verdict: GO (no blockers)

Blockers: **none** — protected paths empty, gates green ×3, no new lint
errors, build clean, no migrations, no dependency/env changes.
Non-blocking risks (acknowledge before merge):
1. Preview + production share env vars — test previews read-only.
2. Notes-failure message will become visible to partners (pre-existing DB
   trigger bug, now surfaced; DB fix still required).
3. Mobile shell + sticky topbar + new filters are visual-unverified here (no
   browser in audit) — covered by the smoke test above.
