# Current Tasks

Shared source of truth for what's in progress, what's next, and what's done — see
[AGENTS.md](../AGENTS.md) §"Task Tracking" for the rules governing this file.

## In Progress

_Nothing currently in progress._

## Next / Blocked

- **Local dev database is schema-drifted.** The local Postgres instance (`LOCAL_DATABASE_URL`,
  `localhost:5432`) was originally set up via `prisma db push` and is missing the `StudioSettings`,
  `EmailTemplate` tables and several newer columns that exist on the main database. Every table in
  it is currently empty, so a `prisma db push --accept-data-loss` against it is safe, but this is a
  destructive-capable command that Prisma's own safety guard requires explicit owner consent for
  before an agent can run it — blocked pending that confirmation. Once approved: run the push, then
  seed it (`tsx prisma/seed.ts` with `DATABASE_URL` pointed at the local DB).
- **WhatsApp Cloud API sending not implemented.** `StudioSettings` already stores the Phone Number
  ID / Business Account ID / Access Token (encrypted), but nothing sends through Meta's API yet —
  the only WhatsApp channel today is the manual `wa.me` deep link / "Copy Message" button. Needs
  Meta Business verification + template approval (`monthly_fee_notice`, `payment_reminder`) before
  this can be built — see docs/05-notifications-whatsapp.md §5.2, §5.5.
- **No automated check for schema/migration drift.** The pre-push migration-diff check was removed
  at the owner's request (it needed a shadow database that was never configured, so it always
  silently skipped). If this safety net is wanted back, it needs a real shadow database wired into
  `prisma.config.ts`.

## Done

### 2026-09-07
- **Added a Teacher module.** Requirements doc only gave `Class` a free-text `teacher` string,
  flagged as the doc's clearest blind spot in `docs/09-status-report-and-gap-analysis.md` §9.4.
  Added a `Teacher` table with full CRUD at `/admin/teachers` (list/detail/new/edit, mirroring the
  Families module), and turned `Class.teacher` into a real `teacherId` relation — the Class
  create/edit forms now use a Teacher picker (with an inline "add a new teacher" shortcut) instead
  of free text, and the Classes list/detail pages show/link the linked teacher. Migration
  (`20260907065905_add_teacher_module`) backfilled one `Teacher` row per distinct existing
  free-text name and relinked all classes before dropping the old column — verified against the
  live data first (4 distinct names, 6 classes, all correctly relinked, nothing lost). `npx tsc
  --noEmit`, `eslint`, `npm test` (52 tests), and `npm run build` all pass.
  Deliberately **not** linked `Expense.teacherId` in this pass (kept out to keep the diff scoped
  per AGENTS.md Rule 8) — flagged as a natural fast-follow for instructor-pay reporting.
- **Closed out the four lower-priority items flagged in `docs/09-status-report-and-gap-analysis.md`
  §9.4** (class capacity, refunds, data export — signed consent capture left open, still just a
  boolean-record limitation worth knowing about) plus the `Expense.teacherId` fast-follow flagged
  above. Owner picked the scope for each via a clarifying question first (soft cap, no waitlist;
  document-the-policy over new refund UI; add CSV export over just documenting the answer):
  - `Class.capacity` (optional): enrolled/capacity shown on the classes list, class detail page,
    and the "Add Enrollment" modal, which warns (not blocks) once a class is full. No waitlist.
  - `Expense.teacherId` (optional, any category): Expense form gained a Teacher select; the Teacher
    detail page now has a "Payments to This Teacher" card with a running total.
  - Refund policy documented as "negative adjustment with a note" — and `setBillingAdjustment`'s
    block on `status = PAID` bills was removed, since that was the one case a refund actually
    happens; it now correctly recomputes to `OVERPAID`. The Adjustment modal explains this inline.
  - "Export CSV" buttons added to the Students and Billing pages (`src/lib/csv.ts`), generated
    client-side from data the page already has — no new server endpoint.
  Migration `20260907082608_add_class_capacity_and_expense_teacher`. Re-ran the Playwright
  acceptance suite (`npm run test:e2e`) and `npm test` (52 tests) after — both pass; `tsc --noEmit`
  and `eslint` clean.

### 2026-09-05
- Discount policy, SMTP, and WhatsApp credentials moved from `.env` into admin-editable
  `StudioSettings` (encrypted at rest for the SMTP password / WhatsApp access token).
- `/api/cron/generate-monthly-billing` and `/api/cron/send-payment-reminders` implemented and
  scheduled (`vercel.json`), `CRON_SECRET`-protected.
- Settings page reorganized into tabs (Appearance / Billing / Integrations / Email Templates);
  fixed a bug where the font size (and theme color) setting didn't actually apply after saving;
  replaced the raw hex color inputs with a single preset-theme dropdown.
- Fixed a React Hook Form bug (shared `FORM` component) where re-selecting a value matching what a
  form originally loaded with left the Save button stuck disabled even though the server held a
  different value.
- Added the Email Template module: `EmailTemplate` table + Settings tab for editing the subject/body
  of the 4 outbound emails (registration received, enrollment confirmed, monthly fee notice,
  payment reminder), each with placeholder substitution and a "Reset to Default" option, rendered
  inside a fixed HTML shell (theme-colored header with logo, footer) built from `StudioSettings`.
- Fixed a Windows-specific `lint-staged`/pre-push hook failure ("command line is too long") on large
  changesets by lowering its `--max-arg-length` chunking budget.
- Email Templates settings tab reworked to a dropdown (pick which of the 4 emails to edit) +
  subject/body form, instead of showing all 4 as separate always-visible cards.
- Seeded realistic mock data (6 classes, 6 families/8 students covering the discount-combination
  cases, 1 pending registration, a few expenses/other-income) into the main database via
  `npm run db:seed-mock` (`prisma/seed-mock-data.ts`, safe to re-run — skips if families already exist).
- Fixed a real bug (not caused by this session's other changes, just never triggered until mock data
  existed): opening a registration request that had a requested class attached crashed the page —
  `getRegistrationRequestById` was passing a full `Class` row (with a `Decimal` field) across the
  server/client boundary, which Next.js rejects. Narrowed to `select: { id, name }`.
- Added a notification bell to the admin header (`NotificationBell`) with a badge totaling pending
  registration requests, bills not yet sent to families, and email sends that failed in the last 30
  days. Polls every 60s rather than being wired to invalidate from every relevant mutation.
