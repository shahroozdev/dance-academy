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
- **WhatsApp activation and live verification pending.** Template sending is implemented, including
  the explicit family send action, optional scheduled monthly notices/reminders, provider reference
  logging, and failures. Next: verify Meta credentials and the two approved templates, configure
  `WHATSAPP_GRAPH_API_VERSION` and template language, and enable `WHATSAPP_AUTOMATION_ENABLED`
  when ready. See `docs/10-admin-flow-and-operations.md` for exact parameters and behavior. No live
  parent messages were sent during development checks. Delivery/read webhooks remain unimplemented.
- **No automated check for schema/migration drift.** The pre-push migration-diff check was removed
  at the owner's request (it needed a shadow database that was never configured, so it always
  silently skipped). If this safety net is wanted back, it needs a real shadow database wired into
  `prisma.config.ts`.

## Done

### 2026-09-08
- **Created the client PDF user manual.** Delivered `docs/user-manual/Malhaar-Dance-Company-User-Manual.pdf` (32 A4 pages, 22 screenshot figures, linked contents/index, bookmarks, worked examples, troubleshooting, three appendices), self-contained HTML, reusable screenshots and build source. Validated page count, 68 link annotations, images/anchors, and footer overlap; visually reviewed seven representative pages. No business records changed or parent messages sent. Final website/support details were not supplied; a handover worksheet is included. Additional Import Students/Add Expense/Add Income modal captures hit the error boundary during concurrent local UI edits; unsuccessful images were excluded, with capture limitations documented in `docs/user-manual/README.md`.
- **Fixed stale admin sessions crashing /admin.** Rejected sessions redirect to login; login checks current database access before redirecting active admins back to the dashboard, replacing the proxy's JWT-only redirect. Preserved owner-only authorization and existing dashboard layout edits. Added missing/disabled/invalid-role session regression coverage. All 167 tests and TypeScript pass; full lint has no errors (unrelated temporary-script warnings remain). Browser verification was not run.

### 2026-09-07
- **Closed the remaining Varsha/Malhaar billing audit items.** Mid-month enrollments are now
  prorated to sessions actually falling within the enrolled range (`computeProratedLineItemAmount`,
  `src/lib/billing.ts`), not the full month. Seasonal/special-program charges bill exactly once per
  enrollment — `buildLineItemInputs` now skips re-billing a `SEASONAL` enrollment already charged in
  an earlier month. Seasonal/non-discount-eligible line items are excluded from *and* unaffected by
  both the multi-class and sibling discount (previously only excluded from the multi-class count;
  the sibling discount was still taken from a subtotal that included them), enforced in
  `computeStudentBilling` itself rather than only via the admin-set `Class.discountEligible` flag —
  a `SEASONAL` class is now always treated as non-discount-eligible in the billing logic regardless
  of that flag. Added a billing finalization gate: `ClassMonthlyFee.isFinalized`/`finalizedAt`
  (migration `20260907111531_add_class_monthly_fee_finalization`) records staff sign-off on a
  class's billable session count per month (Finalize/Un-finalize/Finalize-All on
  `/admin/class-fees`, cleared automatically on any fee edit); every notification/reminder send path
  (`sendFamilyNotificationEmail`, `sendMonthlyWhatsApp`, `markFamilyNotificationSent`,
  `sendPaymentReminders`/`sendFamilyPaymentReminder`) now checks it first — manual sends throw
  naming the unfinalized classes, bulk/cron sends silently skip and retry next run. Partial-payment
  reminders were already correct (use `balance`, not `finalAmountDue` — verified, no change needed).
  Updated `docs/04-business-logic-billing-discounts.md` (§4.1-4.3 corrected, new §4.7) and
  `docs/10-admin-flow-and-operations.md` (finalization step, seasonal/regular pricing section); the
  admin handoff walkthrough itself already existed there, correcting `docs/09`'s stale claim that it
  didn't. Added coverage in `src/lib/billing.test.ts` and `src/actions/flow.test.ts`. `npx tsc
  --noEmit`, `npm run lint`, and `npm test` (157 tests) all pass; `npm run build` and the Playwright
  e2e suite were not rerun.
- **Resolved app flow review issues.** Added active-admin authorization and runtime validation to
  browser actions, owner-only settings enforcement, a minimal public class query, and server-only
  job/mail services so protected cron routes keep working without a browser session. Historical
  billing now includes ended enrollments overlapping the billed month and charges each class once;
  serializable transactions with conflict retries protect enrollment/registration/payment writes.
  Added overpayment refund recording as negative payment ledger entries (no schema change), remaining-
  balance reminders, automatic retry eligibility after failures, and an explicit family reminder
  action for older failures. Registration family matching normalizes phone/email, rejects ambiguous
  matches, and records the approving/rejecting admin. Implemented configured WhatsApp template
  sending; activation remains listed above. Added the operating guide and corrected the status report.
  Validation: 140 tests pass, `npx tsc --noEmit`, `npm run lint`, and `npm run build` pass. The browser
  acceptance suite and live messaging were not rerun. Existing separate CSV edits were preserved.
- **Completed source-based app flow review.** Traced registration approval, family/student matching, enrollment, monthly fees/discounts, notifications, payments, and financial reports. All 52 unit tests pass. Browser acceptance suite and live integrations were not rerun; findings above remain open. No functionality changed.
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
- **Added "Import CSV" for Students**, the counterpart to the export button above — client asked
  for a way to bulk-load students instead of adding them one at a time. New `importStudents` action
  (`src/actions/students.ts`) matches each row to an existing `Family` by Parent Phone/Email
  (mirroring the find-or-create logic `approveRegistrationRequest` already uses for registrations),
  creating a new family only when no match is found and the row supplies enough info to make one;
  a student already present in the matched family (by name, case-insensitive) is reported as
  skipped rather than duplicated. Rows are processed one at a time, each in its own transaction, so
  siblings sharing a phone number in the same file correctly land in one family, and a bad row
  doesn't roll back rows already imported. `ImportStudentsModal` (`import-students-modal.tsx`) adds
  a small client-side CSV parser (`parseCsv`/`csvRowsToObjects` in `src/lib/csv.ts`) with a
  downloadable template, a pre-flight validity preview, and a per-row created/skipped/error result
  list after submit. `tsc --noEmit`, `eslint`, and `npm test` (140 tests) all pass.

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
