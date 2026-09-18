# Current Tasks

Shared source of truth for what's in progress, what's next, and what's done — see
[AGENTS.md](../AGENTS.md) §"Task Tracking" for the rules governing this file.

## In Progress

- Nothing currently in progress.

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

- **2026-09-19: Completed Varsha-request verification.** Summer-break months can be scheduled before
  billing and resume automatically; class breaks and accidental enrollment removal correctly update
  sibling-discount qualification. All requested break, pause, adjustment, rehearsal, removal, and
  family-combination paths pass together. All 264 tests, focused lint, TypeScript, and the production
  build pass. The required database updates were applied successfully.

- **2026-09-19: Added rehearsal, enrollment-removal, and family-combination controls.** Staff can
  record separately dated extra sessions billed by session or hour, safely remove accidental
  enrollments, and move siblings into an existing family with automatic unpaid-bill recalculation.
  All 251 tests, focused lint, TypeScript, and the production build pass. The extra-session database
  update was applied successfully.

- **2026-09-19: Completed pre-billing rehearsal and guardian workflows.** Extra sessions can be
  created directly from a class before billing, families can hold multiple editable guardian
  contacts with a chosen primary billing contact, and duplicate families can be combined without
  losing students, registrations, or contacts. All 258 tests, focused lint, TypeScript, and the
  production build pass. The guardian database update was applied successfully.

- **2026-09-18: Added billing exception controls.** Staff can set a no-class month, pause an
  individual enrollment for complete months with automatic resumption, enter one-student monthly
  adjustments, override class-month fees for extra rehearsals, and bulk-recalculate affected unpaid
  bills while preserving bills with payments. All 239 tests, focused lint, TypeScript, and the
  production build pass. The new billing-pause database update was applied successfully.

- **2026-09-17: Made enrollment billing dates timezone-neutral.** Enrollment start/end boundaries
  are database calendar dates, and staff must choose a guided First Billable Date during registration
  approval or manual enrollment. Sessions before the selected date are excluded and sessions on or
  after it are included. The live database conversion was applied successfully. All 226 tests,
  focused lint, TypeScript, and the production build pass.

- **2026-09-17: Audited related enrollment-date billing cases.** Enrollment creation, approval,
  reactivation, ending, monthly boundaries, every weekday, and all admin date displays now use the
  same studio calendar-date rules. The live read-only audit found nine unpaid September bills with
  the same $40-to-$60 discrepancy, no invalid enrollment ranges, and no regular classes missing a
  schedule. All 227 tests, focused lint, TypeScript, and the production build pass.

- **2026-09-17: Fixed same-day enrollment billing recalculation.** Older enrollment timestamps now
  resolve to the studio's calendar date consistently across billing and admin displays. Hannah's
  reported September 10 Thursday enrollment is covered by a regression test and recalculates as
  three sessions ($60 at $20 per session). All 217 tests, focused lint, TypeScript, and the
  production build pass.

- **2026-09-15: Added permanent student and family deletion.** Admins can permanently delete an
  individual student or an entire family from its profile after typing the exact record name. The
  operation removes connected registrations, enrollments, bills, payments, and notifications in a
  safe dependency order. An individual deletion preserves siblings and their family. All 214 tests,
  focused lint, TypeScript, and the production build pass.

- **2026-09-15: Added historical enrollment-date correction.** Staff can enter the actual class
  start date while adding an enrollment and edit it later. The UI explains how to recalculate the
  affected unpaid bill, while paid bills remain protected and use adjustments. Future dates and
  dates after an enrollment ended are rejected. All 210 tests, focused lint, TypeScript, and the
  production build pass.

- **2026-09-11: Polished policy settings and added admin guidance.** Registration Policies now
  guides owners through editing, previewing, and publishing; explains formatting and version history;
  clearly labels unsaved previews; and clarifies how restoring defaults works. Changed-file lint,
  TypeScript, and the production build pass.

- **2026-09-11: Polished registration policy presentation.** The public form now presents the guide
  as a clear Review & Consent step with readable policy cards, visual guidance, a refined scroll
  area, and a distinct required-versus-optional consent panel. Changed-file lint, TypeScript, the
  production build, and a desktop browser check pass.

- **2026-09-11: Added admin-managed registration policies.** The supplied regular-class guide is
  now shown before the required agreement, owners can edit and preview it in Settings, and every
  new request preserves the exact accepted policy version and agreement time. All 206 tests,
  changed-file lint, TypeScript, the production build, and desktop/mobile browser checks pass; the
  database update was applied successfully.

- **2026-09-10: Added billing schedule guidance.** Information icons beside the due-day and
  reminder-delay fields now explain first-of-month automatic bill generation, manual generation,
  how the due day is used, and the one-reminder-per-bill behavior. TypeScript and changed-file lint pass.

- **2026-09-10: Added guidance to every notification setting.** Each staff notification switch
  now has an accessible information icon explaining its trigger, recipient, and purpose. TypeScript
  and changed-file lint pass.

- **2026-09-10: Added optional email during enrollment finalization.** The email switch defaults
  on and includes a tooltip explaining how to defer the message. Turning it off preserves the
  Processed-list send action; a delivery failure does not undo enrollment and clearly guides staff
  to retry later. All 205 tests, focused lint, TypeScript, and the production build pass.

- **2026-09-10: Scaled the registration family picker.** Registration review now searches active
  families by family, parent, phone, or email and fetches only 25 records at a time, loading the
  next page on scroll. Automatic matching remains the default. All 203 tests, focused lint,
  TypeScript, and the production build pass.

- **2026-09-10: Added joining information to the Students table.** The roster now has separate
  Joined Date and Time with Malhaar columns. Joining dates use the saved calendar date without
  timezone shifting, and the duration remains automatically calculated. Six focused date tests,
  TypeScript, and changed-file lint pass.

- **2026-09-10: Added first-class Dance Programs.** Staff can manage each parent-facing program
  once and place multiple independently priced levels or batches beneath it. Classes and registration
  requests now link to programs, registration review is restricted to classes in the requested
  program, and all existing style values were preserved during the successfully applied database
  update. All 201 tests, TypeScript, lint, and the production build pass; lint retains only 16
  existing warnings in temporary scripts.

- **2026-09-10: Added automatic Student Duration with Malhaar.** Student profiles and the roster
  now calculate completed years and months from the original joining date. Staff can set or correct
  that date when adding/editing a student, registration approval uses the original submission date,
  and student CSV import/export includes the source date and calculated duration. Added four date
  calculation tests; all 194 tests, lint, TypeScript, and the production build pass. Lint retains
  only 16 existing warnings in temporary scripts.

- **2026-09-09: Implemented Varsha's style-first registration workflow.** The public form now asks
  only for a dance style, registration review requires staff to select the final active class, and
  finalizing creates the enrollment without sending parent email. Processed requests now provide a
  separately tracked enrollment-confirmation email action. Existing class requests and notification
  history were preserved by the successfully applied data update. The requested billing sentence
  was removed from the default and saved enrollment email. All 190 tests, TypeScript, lint, and the
  production build pass; lint reports only 16 existing warnings in temporary scripts. A complete
  browser test also passed against the configured test database: style-only submission, admin class
  finalization, processed status, and the separate unsent email action were verified without sending
  an email, and all temporary browser-test records were removed afterward.

- **2026-09-09: Imported client-confirmed registration corrections.** Added 11 more students across
  seven families using the contact, name, and joining-date corrections supplied by the client. Eight
  include their original registration history; the three existing-class students were added with
  their historical joining dates. No enrollments or bills were created, and repeat verification
  created no duplicates. Hailyn and Aahil remain pending missing phone details.

- **2026-09-09: Imported verified registration records.** Validated the 36-row source file,
  imported 19 unambiguous students into 14 families with their original registration history,
  emergency details, consent, and requested-program notes, and created no enrollments or bills.
  A repeat verification created no duplicates. Invalid, test, superseded duplicate, and conflicting
  records remain excluded pending corrected information from the client.

- **2026-09-08: Added existing-family selection to registration review.** Automatic matching remains default; staff can choose an active family identified by parent/contact details. Preview remounts on selection to prevent stale matching UI; approval revalidates the family inside the transaction and preserves existing contact/student/enrollment rules. Added 12 regression tests. All 184 tests and changed-file lint pass. Browser verified manual selection, return to automatic, and 390px layout without approving live requests or sending messages. TypeScript still reports existing generated-Prisma notification-setting errors in email/settings actions. Updated the operating guide; the previously delivered PDF has not been regenerated for this feature.

- **2026-09-08: Updated client manual to manual WhatsApp sending only.** Removed direct-send, WhatsApp setup/activation and automation references, provider-template references, and token wording. Explained Open in WhatsApp (wa.me), sending in WhatsApp, and Mark as Sent; clarified email reminder wording. Rebuilt the 32-page PDF and self-contained HTML with no missing images, broken links, or page overflow.

### 2026-09-08 — Admin width correction
- **Fixed whole-page horizontal overflow.** Added `min-w-0` to the dashboard's SidebarInset so intrinsic content widths no longer expand the flex panel beyond the space beside the sidebar. Reproduced on Classes, Billing, Students, and Registrations. Verified 49 browser combinations across seven routes, four viewport widths, and expanded/collapsed sidebar states; wide student tables retain their own horizontal scroll. Changed-file ESLint passes. TypeScript remains blocked by unrelated missing notification-setting fields in generated Prisma types used by `src/actions/email.ts` and `src/actions/settings.ts`.

### 2026-09-08
- **Created the client PDF user manual.** Delivered `docs/user-manual/Malhaar-Dance-Company-User-Manual.pdf` (32 A4 pages, 22 screenshot figures, linked contents/index, bookmarks, worked examples, troubleshooting, three appendices), self-contained HTML, reusable screenshots and build source. Validated page count, 68 link annotations, images/anchors, and footer overlap; visually reviewed seven representative pages. No business records changed or parent messages sent. Final website/support details were not supplied; a handover worksheet is included. Additional Import Students/Add Expense/Add Income modal captures hit the error boundary during concurrent local UI edits; unsuccessful images were excluded, with capture limitations documented in `docs/user-manual/README.md`.
- **Fixed stale admin sessions crashing /admin.** Rejected sessions redirect to login; login checks current database access before redirecting active admins back to the dashboard, replacing the proxy's JWT-only redirect. Preserved owner-only authorization and existing dashboard layout edits. Added missing/disabled/invalid-role session regression coverage. All 167 tests and TypeScript pass; full lint has no errors (unrelated temporary-script warnings remain). Browser verification was not run.

### 2026-09-08
- **Created the client PDF user manual.** Delivered `docs/user-manual/Malhaar-Dance-Company-User-Manual.pdf` (32 A4 pages, 22 screenshot figures, linked contents/index, bookmarks, worked examples, troubleshooting, three appendices), self-contained HTML, reusable screenshots and build source. Validated page count, 68 link annotations, images/anchors, and footer overlap; visually reviewed seven representative pages. No business records changed or parent messages sent. Final website/support details were not supplied; a handover worksheet is included. Additional Import Students/Add Expense/Add Income modal captures hit the error boundary during concurrent local UI edits; unsuccessful images were excluded, with capture limitations documented in `docs/user-manual/README.md`.
- **Fixed stale admin sessions crashing /admin.** Rejected sessions redirect to login; login checks current database access before redirecting active admins back to the dashboard, replacing the proxy's JWT-only redirect. Preserved owner-only authorization and existing dashboard layout edits. Added missing/disabled/invalid-role session regression coverage. All 167 tests and TypeScript pass; full lint has no errors (unrelated temporary-script warnings remain). Browser verification was not run.

### 2026-09-08
- **Audited unavailable WhatsApp controls.** All visible admin screens now offer only manual
  WhatsApp opening while API setup is unavailable. Removed the unused direct-send browser action
  and corrected operating documentation that still described that button.
- **Hid unavailable direct WhatsApp sending.** The fee notification window no longer offers a
  direct API send while its configuration is unavailable; staff can still open WhatsApp with the
  prepared message and send it manually.
- **Separated notification settings from billing.** Settings now has a responsive Notifications
  tab with staff alerts grouped into registration, billing and payments, parent communications,
  and system alerts. Billing now contains only discounts, due dates, and reminder timing.
- **Made the Billing Alert save action sticky.** The save bar now remains visible while the owner
  scrolls through the notification switches and keeps the existing disabled/saving states.
- **Added complete owner-controlled admin alerts.** Billing Settings now has separate enabled-by-
  default switches for new registrations, recorded payments, credits/overpayments, automatic
  billing failures, failed parent fee notices, failed payment reminders, and class fees still
  awaiting finalization. Alerts use the configured staff address or owner fallback. The
  unfinalized-fee reminder waits until the monthly due day and sends at most once per month.
- **Added optional staff confirmations for parent fee notices.** An enabled-by-default switch in
  Billing Settings now sends a checkmarked email to the configured billing-alert address (or active
  owner) after a family notice is successfully emailed, accepted by WhatsApp, or manually marked
  sent. The confirmation identifies the family, billing month, and delivery method. Failed parent
  sends do not trigger a success confirmation.
- **Added a configurable monthly billing-ready admin email.** Billing Settings now has an enabled-
  by-default switch and recipient address (falling back to the active owner email). After the
  scheduled monthly billing run, staff receive the created/updated/skipped summary and a reminder
  to review and finalize Class Fees before parent notices. Turning the setting off skips the alert.
  Added a database migration and focused tests for default fallback, opt-out, and custom recipient.
- **Completed the live deployment A-to-Z acceptance test.** The browser-driven run against the
  client-confirmed test deployment/database passed: admin login and core routes, two public
  registrations, approval and same-family sibling matching, student/class enrollments, mid-month
  proration, 5% multi-class and sibling discounts, seasonal discount exclusion, notification
  blocking before class-fee finalization, post-finalization notification readiness, partial and
  full payment balance/status updates, financial-report visibility, and a second-month check proving
  the seasonal enrollment was charged only once. No email or WhatsApp delivery was triggered. The
  final Playwright run passed in 1.3 minutes; uniquely labelled `LIVE E2E` records remain in the test
  database, including records from selector-debug reruns.

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
