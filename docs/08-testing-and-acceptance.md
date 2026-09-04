# 8. Testing & Acceptance Criteria

## 8.1 Unit tests (Vitest) — billing engine

Directly implements the sample-case matrix required by §16 and derived in
[04-business-logic-billing-discounts.md §4.6](./04-business-logic-billing-discounts.md#46-worked-sample-cases-mirrors-16s-required-test-matrix):

- One-class student → correct Final Amount Due, zero discounts.
- Multi-class student → 5% multi-class discount applied to combined base tuition.
- Siblings (no multi-class) → each gets 5% sibling discount on their own tuition.
- Siblings + multi-class combined (the Nia/Leia case) → reproduces the doc's numbers exactly
  ($144.40 / $56.00 including Leia's adjustment).
- Seasonal flat-fee class → flat fee used verbatim, unaffected by session-count math, excluded from
  multi-class discount count when `discountEligible = false`.
- Cancelled-session adjustment → adjustment applied last, note required, no effect on other months
  or on the Class's standard rate.
- Partial payment → `amountPaid`/`balance`/`status` recompute correctly, status = `PARTIAL`.
- Full payment → status = `PAID`, balance = 0.
- Overpayment → status = `OVERPAID`, balance negative, surfaced for review.
- Idempotent regeneration → running `generateMonthlyBilling` twice on a month with no payments
  yet produces identical results (no duplicate rows, `(studentId, month)` unique constraint holds).
- Regeneration guard → running it on a month where a bill already has a payment leaves that bill
  untouched and reports it as skipped.

## 8.2 End-to-end test (Playwright) — full acceptance flow

Mirrors the doc's §15 "Definition of Done" checklist as one continuous scripted flow:

1. Submit `/register` as a parent for a new student in an existing class.
2. Confirm the `RegistrationRequest` appears in `/admin/registrations`.
3. Approve it; confirm the correct Family and Student are created/matched and an Enrollment exists.
4. Trigger "Generate Bills" for the current month; confirm the new student now has a
   `MonthlyStudentBilling` row with the class's current month fee, with zero admin retyping.
5. Add a second enrollment for the same student in another class; regenerate; confirm the
   multi-class discount now applies.
6. Add a second student to the same family; regenerate; confirm the sibling discount applies to
   both.
7. Add a one-month adjustment with a note; confirm Final Amount Due updates and future months are
   unaffected.
8. Confirm Final Amount Due is visibly prominent on both the billing workspace row and the bill
   detail page.
9. Generate the family-combined message text; confirm it matches the expected format and numbers.
10. (If WhatsApp integration is live) send the notification; confirm `notificationStatus = SENT`
    and a sent date is recorded. If not yet live, confirm the "Copy Message"/`wa.me` fallback
    produces correct text.
11. Record a partial payment; confirm `amountPaid`, `balance`, and `status = PARTIAL` update without
    manual calculation.
12. Record a second payment completing the balance; confirm `status = PAID`.
13. Confirm the dashboard's "Unpaid and partially paid students" list correctly excludes this
    now-paid student and correctly includes any other outstanding one.
14. Confirm the payment above appears in the financial dashboard's "Tuition/Payments Collected" for
    the month it was actually received, without a duplicate manual income entry.
15. Add an Expense (e.g., rent); confirm it appears in Total Expenses for the correct month.
16. Confirm Monthly, Yearly, and All-Time Net Profit all calculate correctly and consistently
    (yearly = sum of that year's months; all-time = sum of all years).

Passing this script end-to-end **is** the MVP acceptance test defined by the requirements
document — not merely "the tables exist," matching the doc's own framing in §15.

## 8.3 Manual QA checklist (pre-launch, once per release)

- Mobile responsiveness of `/register` (parents will overwhelmingly fill this out on a phone).
- Admin table usability at ~50 students of seed data — confirm the grouped/filtered billing
  workspace genuinely avoids long scrolling, not just in theory.
- WhatsApp template rendering on an actual device (emoji/formatting can render differently than in
  the Meta template editor preview).
- Timezone correctness for "month" boundaries (studio's local timezone, not UTC, determines which
  calendar month a payment or bill belongs to).
