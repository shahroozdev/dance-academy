# 7. Implementation Roadmap

Phased so that each phase ends with something demoable, and later phases never require reworking
earlier data models — the schema in [02-database-schema.md](./02-database-schema.md) is designed
up front to avoid that.

## Phase 0 — Project setup
- Initialize Next.js (TypeScript, App Router, Tailwind, shadcn/ui).
- Provision Postgres (Neon or Supabase free tier); wire up Prisma; first migration.
- Auth.js credentials provider; seed one Owner `AdminUser`.
- Deploy skeleton to Vercel; confirm `DATABASE_URL`/env wiring in production.
- **Demo**: admin can log in to an empty dashboard shell.

## Phase 1 — Core data & CRUD
- Family, Student, Class, Enrollment models + migrations.
- `/admin/families*`, `/admin/students*`, `/admin/classes*` CRUD pages.
- Class roster view (§4.5).
- **Demo**: manually create a family, two sibling students, two classes, enroll both students.

## Phase 2 — Registration intake
- `RegistrationRequest` model, public `/register` form + `/api/public/register`.
- `/admin/registrations` queue + find-or-create approval flow (§3.2 automation, rebuilt reliably).
- **Demo**: submit the public form, approve it as admin, confirm the resulting Family/Student/
  Enrollment rows are correct, including a second submission that correctly matches the existing
  family rather than duplicating it.

## Phase 3 — Pricing & billing engine
- `ClassMonthlyFee` model + auto-generation from `Class` standard rate/pricing type.
- `MonthlyStudentBilling` + `MonthlyBillingLineItem` models.
- `computeStudentBilling` pure function + full Vitest suite covering every case in
  [04-business-logic-billing-discounts.md §4.6](./04-business-logic-billing-discounts.md#46-worked-sample-cases-mirrors-16s-required-test-matrix).
- `/admin/billing` generation + workspace (grouped/filtered view), `/admin/billing/[id]` detail,
  adjustment modal.
- `/admin/class-fees` override screen.
- **Demo**: generate a month's bills for the seeded students; verify Nia/Leia numbers from the doc
  reproduce exactly; enter an adjustment and confirm it doesn't touch other months.

## Phase 4 — Payments
- `Payment` model, `/admin/payments*`, record-payment modal wired into billing rows.
- Server-side recompute of `amountPaid`/`balance`/`status` on every payment write.
- Billing workspace filters (Current Month/Unpaid/Partial/Paid/By Class/By Family).
- **Demo**: record a partial then a top-up payment on the same bill; confirm status transitions
  Unpaid → Partial → Paid automatically.

## Phase 5 — Parent notifications
- `buildFamilyMessage` + "Copy Message"/`wa.me` deep-link fallback shipped first (zero external
  dependency, usable immediately).
- Meta Business verification + Cloud API credentials; submit `monthly_fee_notice` template for
  approval.
- WhatsApp send integration + `NotificationLog`, `/admin/notifications` page.
- `payment_reminder` template + `/api/cron/send-payment-reminders`.
- **Demo**: generate a month's bills, send the family-combined message via WhatsApp, confirm the
  log records status/sent date; simulate a past-due unpaid bill and trigger a reminder.

## Phase 6 — Expenses & financial dashboard
- `Expense`, `OtherIncome` models + CRUD pages.
- `/admin/reports/financials` with Monthly/Yearly/All-Time views reproducing the doc's summary
  table layout exactly.
- **Demo**: enter a rent expense and a workshop income line, confirm Net Profit calculates
  correctly for the month and rolls up correctly into the yearly and all-time views.

## Phase 7 — Polish & handoff
- `/admin/settings` (discount %, templates, admin users, business profile).
- Full acceptance test pass against [08-testing-and-acceptance.md](./08-testing-and-acceptance.md).
- Admin handoff document (see below) + short recorded walkthrough.
- Final cost disclosure summary for anything paid (expected: WhatsApp only, <$1–5/mo).

### Required "Programmer Deliverables" (§16), mapped to where they live
- Working MVP → the deployed Vercel app.
- Table relationships & billing flow explanation → [02-database-schema.md](./02-database-schema.md) + [04-business-logic-billing-discounts.md](./04-business-logic-billing-discounts.md).
- List of automations & when they run → the two `/api/cron/*` jobs (documented in
  [05-notifications-whatsapp.md](./05-notifications-whatsapp.md) and
  [04-business-logic-billing-discounts.md §4.5](./04-business-logic-billing-discounts.md#45-monthly-generation-job--idempotency-rules)), plus the on-demand "Generate Bills"/"Send Notifications" buttons.
- Remaining manual monthly tasks → reviewing/approving generated bills and adjustments before
  sending notifications (deliberately kept manual — the doc wants final numbers reviewed by a human
  before they reach a parent, not a fully blind auto-send).
- Cost disclosure → [01-architecture-and-tech-stack.md §1.5](./01-architecture-and-tech-stack.md#15-cost-model-for-the-required-disclose-recurring-costs-deliverable) and [05-notifications-whatsapp.md §5.2](./05-notifications-whatsapp.md#52-delivery-channel-decision).
- Admin handoff walkthrough (add a class, change a monthly fee, register/enroll a student, review
  bills, send notifications, record a payment, enter an expense, review profit) → written as a short
  companion doc once the UI exists (`docs/09-admin-handoff.md`, produced in Phase 7 once screens are
  final so it reflects the real, shipped UI rather than the plan).
- Sample-case testing → [08-testing-and-acceptance.md](./08-testing-and-acceptance.md).
