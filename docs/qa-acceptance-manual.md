# Manual Browser Acceptance Test

**Revenue Partner Workspace — Irtiqa AI**
**Date:** 2026-07-14
**Estimated time:** 20 minutes

> ⚠️ **Security:** Do not paste passwords or sensitive data into shared logs.
> Use the QA partner (`company_id: QA-TEST-001`) for all partner tests.
> Admin credentials are known to the deployment team only.

---

## Prerequisites

- [ ] Application deployed and accessible at its URL
- [ ] QA seed data loaded (`npx tsx src/scripts/seed-qa.ts`)
- [ ] QA partner password obtained from seed output

---

## 1. Login (2 min)

### 1.1 Partner Login
- [ ] Navigate to `/login`
- [ ] Enter QA partner Company ID (`QA-TEST-001`) and password
- [ ] Verify: redirected to `/partner` dashboard
- [ ] Verify: partner name and company ID displayed in header
- [ ] Verify: program day shown (positive number)

### 1.2 Admin Login
- [ ] Toggle to Admin mode
- [ ] Enter admin email and password
- [ ] Verify: redirected to `/admin` dashboard
- [ ] Verify: admin sidebar visible with 7 navigation items

### 1.3 Invalid Credentials
- [ ] Try wrong password for partner login
- [ ] Verify: error message shown, not redirected

---

## 2. Admin Features (6 min)

### 2.1 Dashboard
- [ ] Verify stat cards load (total partners, leads, reports)
- [ ] Verify recent reports and activity sections populate

### 2.2 Partner Management
- [ ] Navigate to Admin → Partners
- [ ] Verify QA partner appears in list (QA-TEST-001)
- [ ] Verify search/filter works

### 2.3 Lead Management
- [ ] Navigate to Admin → Leads
- [ ] Verify leads are listed with partner assignments
- [ ] Verify search and pagination work
- [ ] Test bulk assign: select 2 leads, assign to QA partner

### 2.4 Announcements
- [ ] Navigate to Admin → Announcements
- [ ] Create a new announcement
- [ ] Verify it appears on partner dashboard
- [ ] Delete the announcement (or unpin)

### 2.5 Resources
- [ ] Navigate to Admin → Resources
- [ ] Create a new resource
- [ ] Verify it appears on partner resource page
- [ ] Delete the resource

### 2.6 Activity Log
- [ ] Navigate to Admin → Activity
- [ ] Verify recent partner actions are visible
- [ ] Verify timestamps are human-readable

### 2.7 Reports
- [ ] Navigate to Admin → Reports
- [ ] Verify partner reports are visible
- [ ] Verify date range filter works

---

## 3. Partner Features (8 min)

### 3.1 Dashboard
- [ ] Verify stats cards load correctly
- [ ] Verify program progress bar shows correct percentage
- [ ] Verify announcements section shows recent items
- [ ] Verify lead summary shows assigned leads count

### 3.2 Daily Report
- [ ] If today's report not yet submitted: verify alert banner
- [ ] Submit today's report (enter small numbers, e.g., 3/1/0)
- [ ] Verify: success message shown
- [ ] Verify: alert banner now shows "Today's report submitted"
- [ ] Try submitting again for the same day
- [ ] Verify: reject message "already been submitted"

### 3.3 Lead Center
- [ ] Navigate to Partner → Leads
- [ ] Verify assigned leads are listed
- [ ] Test search: type a company name, verify filter works
- [ ] Change status of a lead (e.g., Contacted → Follow Up Required)
- [ ] Verify: success feedback shown
- [ ] Verify: status badge updates immediately

### 3.4 Progress
- [ ] Navigate to Partner → Progress
- [ ] Verify program day displayed
- [ ] Verify streak count (if reports submitted)
- [ ] Verify lead breakdown by status shown
- [ ] Verify performance totals (contacted, appointments, deals)

### 3.5 Resources
- [ ] Navigate to Partner → Resources
- [ ] Verify resources grouped by type (document/link/video)
- [ ] Only active resources visible

### 3.6 Announcements
- [ ] Navigate to Partner → Announcements
- [ ] Verify announcements list loads
- [ ] Pinned announcements shown first (with megaphone icon)

---

## 4. Security Verification (3 min)

### 4.1 Partner Cannot Access Admin
- [ ] While logged in as partner, navigate to `/admin`
- [ ] Verify: redirected to login or blocked

### 4.2 Admin Cannot Submit Reports
- [ ] While logged in as admin, navigate to `/partner/report`
- [ ] Verify: redirected or blocked (admin is not a partner)

### 4.3 Direct URL Access
- [ ] While logged out, try navigating to `/partner`
- [ ] Verify: redirected to `/login`

### 4.4 Non-existent Routes
- [ ] Navigate to `/nonexistent`
- [ ] Verify: 404 or not-found page

---

## Test Results

| Section | Tests | Passed | Failed |
|---|---|---|---|
| 1. Login | 3 | — | — |
| 2. Admin Features | 7 | — | — |
| 3. Partner Features | 6 | — | — |
| 4. Security | 4 | — | — |
| **Total** | **20** | **—** | **—** |

**Tester:** ____________________  **Date:** ____________________

**Found issues (describe):**

1. _________________________________________________________________
2. _________________________________________________________________
3. _________________________________________________________________

**Sign-off:** ✅ Pass  /  ❌ Fail (circle one)
