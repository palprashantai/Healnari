# HealNari — Production Readiness Audit

**Date:** 2026-08-12
**Scope:** Full-repository static audit (backend `vision/`, frontend `src/`, database `supabase/migrations/`) plus this session's own hands-on build-and-live-verify work on the payment, refund, booking, and consultation systems.
**Target markets:** India (primary) → UAE/Dubai (secondary)
**Overall readiness:** 5.8 / 10 — **not launch-ready, but one focused P0 sprint away**
**Findings:** 34 open (7 Critical · 7 High · 12 Medium · 8 Low) + 12 things already solid

---

## 1. Executive Summary

HealNari is further along than a typical pre-launch audit finds. Across this engagement, the fake-payment flow, fake refunds, and several fabricated dashboard numbers that plague most MVPs at this stage have already been replaced with working integrations against Cashfree, real notification delivery, and a genuine double-booking guard. That is the good news, and it is not small.

The bad news is that three of those real systems are currently **not switched on in production**. The database migrations that add Cashfree's order-tracking columns and the double-booking constraint were written this session but never applied to the live database — which means, as deployed right now, two patients *can* book the identical slot, and a patient trying to pay will hit a raw Postgres error. Alongside that sits one serious access-control gap: any doctor account, once KYC-verified, can currently read *any* patient's lab reports, uploaded documents, and emergency contacts by guessing a UUID — not just their own patients'. And the platform has zero automated tests protecting any of this from regressing.

None of the three are large fixes. All three are launch-blocking. The remaining findings — timezone handling, currency, accessibility, AI chat guardrails — are real and worth the P1 sprint that follows, but they don't carry the same "a patient gets hurt or a doctor gets underpaid this week" urgency as the P0 list.

This report reads front-to-back as: where the product stands (scorecard, market readiness), what's already been fixed this session, every open finding grouped by severity, findings indexed by domain, and the order to fix them in. Jump to **[§8 Prioritized Fix Plan](#8-prioritized-fix-plan)** for just the punch list.

---

## 2. Readiness Scorecard

Scores reflect the system **as it runs in production today**, not the code sitting unapplied in migration files. Two categories carry an asterisk — their code is materially better than their live score, entirely because of the pending-migration issue in §5.

| Dimension | Score |
|---|---|
| Architecture | 7 / 10 |
| Security | 5 / 10 |
| Patient / Doctor UX | 6 / 10 |
| Booking engine * | 6 / 10 |
| Online consultation | 8 / 10 |
| Payments * | 6 / 10 |
| Performance | 6 / 10 |
| Accessibility | 5 / 10 |
| India readiness | 7 / 10 |
| UAE readiness | 2 / 10 |

\* Booking & Payments code would score 9/10 once the pending migrations (DB-4, DB-5) are applied — today's score reflects the live, unprotected state.

The gap between today's 5.8 and a genuinely launch-ready ~8 is mostly **operational** (apply three migrations, add one access-control check, wire up a login rate limit) rather than architectural. The bones — service/DTO discipline, a real payment gateway, a sound WebRTC call stack — are already sound.

---

## 3. India & UAE Readiness

### India — 7/10 — Close, pending-migration risk only
- Every flow (booking, Cashfree checkout, WebRTC calls, reminders) was built and tested against INR/Asia-Kolkata assumptions, so nothing here is a design gap — it's the same P0 list as everywhere else.
- Once DB-4/DB-5 are applied and the doctor-access bug (SEC-1) is fixed, India is genuinely close to launch-ready.
- The IST-only assumption baked into the schema (DB-2) doesn't hurt India today, but it's worth fixing now rather than retrofitting after real appointments exist.

### UAE / Dubai — 2/10 — Not buildable on current schema
- No **currency** column exists anywhere — `payments.amount`, `consultation_fee`, and every ₹ symbol in 23 frontend files assume INR. Cashfree's order creation hardcodes `order_currency: 'INR'`.
- No **timezone** column exists anywhere — a Dubai clinic and a Kolkata clinic have no way to be represented as different timezones in the current schema.
- This isn't a configuration flag away — it needs a real P1 project: currency + timezone columns, a locale/country config object, and an audit of every date/amount formatter in the frontend.

---

## 4. Fixed This Session

Listed for accuracy — a report that only lists problems misrepresents where the product actually stands. Everything below was fake or missing at the start of this engagement and is now real, working code (subject to the pending-migration caveat in §5).

- ✅ **Real Cashfree payment gateway** — replaced an instant fake "mark as Paid" click with real order creation, Drop-in checkout, and webhook-verified server-to-server reconciliation.
- ✅ **Real refunds** — replaced a status-flip-only "process refund" button with an actual Cashfree Refunds API call and an honest Refund Pending → Refunded state.
- ✅ **Payout balance validation** — a doctor can no longer request a payout larger than their real settled balance.
- ✅ **Double-booking guard** — a DB-level unique constraint plus service-layer conflict handling now exists (code complete; not yet applied live — see DB-4).
- ✅ **Live queue position & ETA** — patients see a real "#2 in queue, ~15 min" instead of no signal at all.
- ✅ **Automated reminders & delay notices** — a 30-minute-before push reminder, and a "doctor is running behind" notice when the live queue says so.
- ✅ **Consultation timeline** — appointments, prescriptions, labs and notes merged into one chronological view for both patient and doctor.
- ✅ **AI pre-consult brief** — summarizes only facts already on file for the doctor; the prompt explicitly forbids inventing or inferring anything not listed.
- ✅ **Call resilience** — a camera/mic pre-join check, a live connection-quality signal, and a "continue with audio only" fallback on a weak connection.
- ✅ **PDF invoices & receipt emails** — a real generated invoice, attached to a real email, sent on a real payment confirmation — plus in-app notifications for both patient and doctor.

---

## 5. Critical Findings (7)

Fix before any real user touches the app.

### SEC-1 — Any verified doctor can open any patient's medical records
**Domain:** Security, Patient Privacy
**Scenario:** the records-access check only verifies "is this caller a KYC-verified doctor" — not "does this doctor have any appointment or care relationship with this patient." A doctor who has never treated a patient can fetch their lab reports, uploaded documents, vaccination history, and emergency contacts by guessing or enumerating a patient UUID. Prescriptions are correctly scoped to the prescribing doctor; records are not — the same module is inconsistent with itself.
**Fix:** scope doctor record access to patients with an actual appointment/care relationship, matching how prescriptions already work.
**Files:** `vision/src/modules/records/services/records.service.ts:113`, `patients.service.ts:36,77,88,120`

### DB-1 — A production table's migration file is corrupted
**Domain:** Database, Disaster Recovery
**Scenario:** `0018_public_leads.sql` — the migration that should create `consultation_requests` and `newsletter_subscribers` — contains four bytes of garbage text. Both tables exist and work in the live database, but nothing in source control can reproduce them. A fresh staging environment, a disaster-recovery restore, or a new engineer running the migrations from scratch silently ends up missing both tables.
**Fix:** `pg_dump --schema-only` both live tables (plus their RLS policies and indexes) and replace 0018's content with real, idempotent DDL.
**File:** `supabase/migrations/0018_public_leads.sql`

### DB-4 — The double-booking guard is written but not live
**Domain:** Booking, Database
**Scenario:** verified via a live duplicate-insert test this session — the unique index preventing a doctor from being double-booked at the same date/time was written in migration 0020 but has never been applied to the production database. Every "no double booking" claim elsewhere in this system is describing a guard that isn't currently switched on.
**Fix:** apply migration 0020 via the Supabase SQL editor. Five minutes of work; blocks the single most important booking guarantee until done.
**File:** `supabase/migrations/0020_appointment_double_booking.sql`

### DB-5 — The entire Cashfree payment flow is non-functional in production
**Domain:** Payments, Database
**Scenario:** verified live — `payments.cf_order_id` and `cf_payment_id` (added in migration 0023) don't exist in the production database. The very first step of any real patient payment, `createPaymentOrder()`, will fail with a raw "column does not exist" Postgres error the moment a real patient tries to pay.
**Fix:** apply migration 0023 (and 0024, for the linked refund columns) via the Supabase SQL editor before any real payment is attempted.
**File:** `supabase/migrations/0023_cashfree_payment_gateway.sql`

### DB-2 — No timezone concept exists anywhere in the schema
**Domain:** i18n, Database
**Scenario:** `appointments.scheduled_at` is built as a naive `timestamp` (no timezone) parsed from a date plus a display string like `'10:30 AM'`. No table anywhere carries an IANA timezone. Today this "works" only because every doctor and patient happens to share Asia/Kolkata implicitly — the instant a Dubai-based doctor or patient is onboarded, slot generation, reminders, and delay notifications compute against the wrong wall-clock time, silently, with no error.
**Fix:** add an IANA timezone column (doctor/clinic-level), store `scheduled_at` as a true `timestamptz` derived from it, and audit every cron/reminder/display path that touches appointment time.
**File:** `supabase/migrations/0006_schema_hardening.sql` (scheduled_at)

### DB-3 — No currency field exists — the schema can only bill in rupees
**Domain:** i18n, Database
**Scenario:** `payments.amount`, `profiles.consultation_fee`, `payouts.amount`, and `refund_requests.amount` are all bare `numeric` columns with an implicit INR assumption — matched by 23 frontend files that hardcode the ₹ symbol, and by the Cashfree integration hardcoding `order_currency: 'INR'`. A single AED-charging doctor cannot be onboarded today without a schema and gateway change.
**Fix:** add a `currency` column (default `'INR'`) to all four tables, thread it through to Cashfree's order params, and replace hardcoded ₹ literals with a shared `formatCurrency()` helper.
**Files:** 23 frontend files; `vision/src/core/cashfree/cashfree.service.ts`

### OPS-1 — Zero automated tests exist for any real business logic
**Domain:** Testing
**Scenario:** the only test files in the repository are unmodified Nest CLI boilerplate (`"Hello World!"` assertions). Nothing exercises appointment booking, payment reconciliation, refunds, or auth/access control. The frontend has no test runner configured at all. A regression in the double-booking constraint or the payment webhook ships with zero automated signal — exactly the two systems this report just found broken in production.
**Fix:** before further feature work, add a minimal Jest suite covering: concurrent double-booking (100 simultaneous requests → exactly one success), payment webhook idempotency, and the doctor/patient IDOR boundary from SEC-1.
**Files:** `vision/src/app.controller.spec.ts`, `vision/test/app.e2e-spec.ts`

---

## 6. High Findings (7)

Fix before serious user acquisition.

### SEC-2 — Full API documentation is publicly exposed in production, unauthenticated
**Domain:** Security
**Scenario:** Swagger docs are mounted at `/api/docs` with no environment check and no auth guard — anyone who finds the URL sees the exact shape of every endpoint and DTO, materially easing enumeration and IDOR attacks against findings like SEC-1.
**Fix:** gate Swagger setup behind `NODE_ENV !== 'production'`, or put it behind an admin-only check.
**File:** `vision/src/main.ts:50-58`

### SEC-3 — Login has no dedicated brute-force protection
**Domain:** Security
**Scenario:** the only rate limit anywhere is a flat global 100 requests/minute/IP, applied identically to `POST /auth/login` as to every other route. Combined with no account lockout, a small pool of IPs can credential-stuff weak passwords at a comfortable rate.
**Fix:** add a strict per-route throttle (e.g. 5/minute) on `/auth/login` and `/auth/register`.
**File:** `vision/src/core/auth/auth.controller.ts:67`

### SEC-4 — Auto-generated patient passwords aren't cryptographically random, and are emailed as plaintext
**Domain:** Security
**Scenario:** the password generated when a consultation request converts to a real account uses `Math.random()` — not a CSPRNG, and predictable given enough samples — then emails that exact password in plaintext rather than a one-time setup link.
**Fix:** switch to `crypto.randomBytes`; prefer a password-setup link over emailing the credential directly.
**File:** `vision/src/modules/leads/services/leads.service.ts:113,159`

### FE-1 — A failed data load looks identical to a genuinely empty account
**Domain:** Patient UX, Error Handling
**Scenario:** the single fetch powering the entire patient/doctor app (appointments, records, billing, everything) only `console.error`s on failure — no toast, no error state, no retry. A patient whose data fails to load from a network blip or backend restart sees the same "no appointments yet" screen as a brand-new signup, with no indication anything went wrong.
**Fix:** add an error state to the data context; surface a "we couldn't load your data — retry" banner instead of silently rendering empty.
**File:** `src/context/ClinicDataContext.jsx:147-202`

### FE-2 — Form labels aren't programmatically associated with their inputs, app-wide
**Domain:** Accessibility
**Scenario:** across profile forms, booking modals, prescriptions and records, labels sit visually next to inputs but almost never use `htmlFor`/`id` pairing. A screen reader focusing any of these fields won't announce what it is — this is the dominant pattern, not a one-off.
**Fix:** add `htmlFor`/`id` pairs across form fields, or wrap inputs inside their label.
**Files:** `patient/pages/Profile.jsx`, `doctor/pages/Profile.jsx`, `Discovery.jsx`

### AI-1 — The patient AI chat has no explicit red-flag/emergency escalation instruction
**Domain:** AI Safety, Patient UX
**Scenario:** the safety instruction is one generic sentence ("suggest seeing a doctor for anything concerning"). There's no specific instruction for heavy bleeding, severe abdominal pain, chest pain, or self-harm ideation to trigger an explicit "seek emergency care now" response rather than a soft suggestion.
**Fix:** add explicit red-flag-symptom detection and an emergency-escalation response template to the system prompt.
**File:** `vision/src/modules/ai/services/ai.service.ts:199-210`

### AI-2 — The public, unauthenticated landing-page AI chat has zero medical-safety guardrail
**Domain:** AI Safety
**Scenario:** unlike the patient-app chat and the consult-brief summarizer (both reviewed and appropriately guarded), the anonymous landing-page assistant's entire instruction is "answer from context, say you don't know otherwise" — no "never diagnose," no "don't invent facts." This is the least-guarded AI surface and the most exposed — reachable by anyone with no login.
**Fix:** apply the same safety instruction used in the patient agent to this prompt.
**File:** `vision/src/modules/ai/services/ai.service.ts:279-285`

---

## 7. Medium Findings (12)

Important, not launch-blocking.

| ID | Finding | Domain | File |
|---|---|---|---|
| SEC-5 | Avatar uploads accept any file type — lab reports correctly don't | Security | `vision/src/core/auth/auth.controller.ts:104-110` |
| SEC-6 | No audit log exists anywhere in the system | Security, Admin UX | `vision/src/modules/admin/services/admin.service.ts` |
| DB-6 | Two RLS backstop policies grant blanket access (`using (true)`) | Database | `supabase/migrations/0003_admin_tables.sql` |
| DB-7 | Schema has no "this doctor's patients" concept — only "anyone who ever booked" | Database, Doctor UX | RLS policies, multiple migrations |
| FE-3 | Every page load waits on 9 sequential API calls that don't depend on each other | Frontend, Performance | `src/context/ClinicDataContext.jsx:157-196` |
| FE-4 | AI chat widget carries no visible "AI, not a clinician" disclaimer | AI Safety | `src/tools/AiChatWidget.jsx` |
| OPS-3 | No external error monitoring — production failures are stdout-only | Deployment | `vision/src/main.ts` |
| OPS-4 | Reminder/delay-notification crons will double-send once horizontally scaled | Notifications, Deployment | `appointments.service.ts:439,484` |
| OPS-5 | A missing build-time env var (`VITE_API_URL`) breaks the entire production frontend silently | Deployment | `vite.config.js`, `src/lib/apiClient.js:3` |
| OPS-6 | `NODE_ENV` is never explicitly set — a stack-trace leak waiting for a misconfigured host | Deployment, Security | `http-exception.filter.ts:37` |
| DB-8 | The AI knowledge-base table (`documents`) has RLS disabled and no owner column | Database | `supabase/migrations/0004` |
| DB-9 | Unclear whether a suspended account is blocked mid-session, not just at login | Security | `supabase/migrations/0016_admin_persistence_gaps.sql` |

**Details, one line each:**

- **SEC-5:** apply the same mimetype allow-list already used for lab reports (PDF/JPEG/PNG) to avatar uploads.
- **SEC-6:** add a minimal `audit_log` table and write to it from every mutating admin-service method (KYC, refunds, payouts, broadcasts).
- **DB-6:** scope `support_tickets`/`refund_requests` RLS policies to `current_app_role() = 'admin'` instead of `using (true)`.
- **DB-7:** once SEC-1 is fixed at the app layer, mirror the same relationship at the schema level so RLS is a real backstop.
- **FE-3:** batch the independent calls (profile, cycle-logs, vitals, transactions, appointments, etc.) with `Promise.all`.
- **FE-4:** add a small persistent line in the chat widget header: "AI assistant — not a substitute for medical advice."
- **OPS-3:** wire up Sentry (or equivalent) before real user traffic.
- **OPS-4:** claim atomically first (`UPDATE ... WHERE reminder_sent_at IS NULL RETURNING *`), notify second.
- **OPS-5:** fail (or loudly warn) the production build when `VITE_API_URL` is unset.
- **OPS-6:** set `NODE_ENV=production` explicitly on the deploy platform.
- **DB-8:** document the shared-knowledge-base assumption, or add an owner column + RLS before any per-user use.
- **DB-9:** confirm (or add) a per-request status check in the auth guard.

---

## 8. Low Findings (8)

Worth cleaning up.

| ID | Finding | Fix |
|---|---|---|
| SEC-7 | Recipient emails and full gateway error bodies land in server logs | Log only order id/status code, not the full response body |
| SEC-8 | Access/refresh tokens live in localStorage, not an httpOnly cookie | Longer-term: move refresh tokens to an httpOnly cookie |
| DB-10 | Analytics counters stored as free text (`"412 KB"`, view/click counts) | Migrate to numeric columns before building real analytics |
| DB-11 | Two admin tables use guessable sequential IDs instead of UUIDs | No urgent action; confirm admin-only authz covers these routes |
| DB-12 | Specialty and payment category are free text, not a canonical list | Introduce a canonical specialties table before multi-country scale-up |
| FE-5 | One unqualified "100% Secure & Confidential" claim on the landing page | Reword to something defensible, e.g. "Encrypted & DPDP-compliant" |
| FE-6 | A fake mock notification still exists in the admin layout dropdown | Wire to the real notifications feed or remove it |
| OPS-7 | A few env vars undocumented; one documented var (`SUPABASE_JWT_SECRET`) is dead | Add missing vars to `.env.example`; remove the dead one |

---

## 9. What's Already Solid

Don't regress these while fixing everything above.

- **Cashfree webhook design** — never trusts the payload; always re-verifies order status server-to-server before marking anything paid.
- **CORS & Helmet** — explicit origin allow-list, not a wildcard; security headers applied.
- **DTO validation** — consistent class-validator coverage across sampled controllers; the historical whitelist-strip bug hasn't recurred.
- **Global rate limiting** — applied application-wide via a global throttler guard, not opt-in per route.
- **Status-literal integrity** — every service-layer status write matches its table's check constraint; zero runtime constraint-violation risk found.
- **The shared Modal component** — real focus trap, Escape-to-close, ARIA dialog semantics, reduced-motion respected — nearly every modal in the app uses it.
- **Action-level error handling** — consistently friendly toasts sourced from real backend messages across ~20 pages sampled.
- **Mobile-adapted video calls** — both call UIs genuinely restructure for narrow screens rather than assuming desktop.
- **Landing-page SEO** — real title/meta/OpenGraph tags plus JSON-LD MedicalOrganization structured data.
- **An actual medical disclaimer** — already present in the footer, with appropriately hedged diagnostic language sitewide; no unsupported claims found.
- **The consult-brief AI summarizer** — explicitly instructed to never invent, assume, or infer facts not already on file.
- **Consistent global error responses** — every sampled controller throws typed exceptions caught by one filter; no raw error leakage when `NODE_ENV` is set correctly.

---

## 10. Findings by Domain

| Domain | Critical | High | Medium | Low |
|---|---|---|---|---|
| Security & access control | 1 | 3 | 2 | 2 |
| Database & schema | 3 | – | 4 | 3 |
| Booking & slots | 1 | – | – | – |
| Payments & refunds | 1 | – | – | – |
| i18n — timezone & currency | 2 | – | – | – |
| Testing & QA | 1 | – | – | – |
| Frontend UX & error states | – | 1 | 1 | 1 |
| Accessibility | – | 1 | – | – |
| AI safety | – | 2 | 1 | – |
| Deployment & ops | – | – | 4 | 1 |
| Admin UX | – | – | – | 1 |
| Landing page | – | – | – | 1 |

---

## 11. Prioritized Fix Plan

### P0 — Must fix before launch (~2-4 days)
- [ ] **DB-4/5/1** — Apply migrations 0018 (reconstructed), 0020, 0023, 0024. *Booking and payments are unprotected/broken without this.*
- [ ] **SEC-1** — Scope doctor record access to an actual care relationship, not just "is a doctor."
- [ ] **SEC-2** — Gate Swagger docs out of production.
- [ ] **SEC-4** — Switch generated passwords to a CSPRNG; stop emailing raw credentials.
- [ ] **SEC-3** — Add a strict rate limit to `/auth/login`.
- [ ] **OPS-1** — Add tests for concurrent double-booking, payment-webhook idempotency, and the SEC-1 boundary.
- [ ] **OPS-5/6** — Set `NODE_ENV=production` explicitly; fail the build if `VITE_API_URL` is unset in prod.

### P1 — Fix before serious user acquisition (~1-2 weeks)
- [ ] **DB-2** — Timezone architecture (DB column + frontend display, doctor/clinic-level).
- [ ] **DB-3** — Currency architecture (DB column + frontend formatter + Cashfree order_currency).
- [ ] **AI-2** — Add a real safety guardrail to the public landing-page chat.
- [ ] **AI-1** — Add explicit red-flag/emergency escalation guidance to the patient chat.
- [ ] **FE-4** — Add a visible AI disclaimer in the chat widget.
- [ ] **FE-1** — Add an error/retry state to the main data-load path.
- [ ] **FE-2** — Associate form labels with inputs app-wide.
- [ ] **SEC-6** — Add an admin audit log.
- [ ] **OPS-3** — Wire up external error monitoring.
- [ ] **OPS-4** — Fix the cron race condition (atomic claim before notify).
- [ ] **SEC-5** — Add a content-type allow-list to avatar upload.

### P2 — Important improvements (ongoing)
- [ ] **FE-3** — Parallelize the nine sequential context fetches.
- [ ] **DB-6/7** — Tighten RLS backstop policies to match real access rules.
- [ ] **OPS-7** — Document missing env vars; remove the dead one.
- [ ] **FE-5** — Soften the "100% Secure" landing-page claim.
- [ ] **FE-6** — Remove the remaining fake mock notification in AdminLayout.
- [ ] **DB-8/9** — Document/fix the documents-table RLS gap; confirm per-request suspension checks.
- [ ] **SEC-7** — Trim sensitive-ish fields out of server logs.

### P3 — Future enhancements (when it matters)
- [ ] **DB-12** — Canonical specialties/categories table.
- [ ] **DB-10** — Convert free-text counters to real numeric columns.
- [ ] **SEC-8** — Move refresh tokens to an httpOnly cookie.
- [ ] **DB-11** — Migrate two admin tables from serial to uuid primary keys.

---

## 12. Methodology & Limitations

- Static, code-grounded review — every finding above cites a real file and line, cross-checked against the live Supabase database via direct REST probes (not assumed from migration files alone).
- Four parallel focused passes (security/auth, database schema, frontend UX/accessibility/i18n, testing/deployment) plus this session's own hands-on work building and live-testing the payment, refund, booking, and consultation systems described in §4.
- Live-verified, not just read: the double-booking gap (DB-4) and the missing payment columns (DB-5) were confirmed by actually attempting the operations against the production database, not inferred from source alone.
- **Not covered:** no live penetration test, no load test, no real screen-reader session, no legal/regulatory review of India (DPDP) or UAE healthcare-advertising compliance. Treat security and accessibility findings as a strong starting list, not a certification.

---

*Re-run the P0 verification steps (live migration checks, IDOR test) after applying fixes — several findings here were only caught because they were tested live, not just read.*
