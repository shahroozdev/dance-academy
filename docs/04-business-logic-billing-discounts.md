# 4. Billing Engine & Discount Rules

This is the highest-risk part of the system to get subtly wrong, so the calculation is implemented
as one pure, unit-tested function (`computeStudentBilling`) that both the monthly generation job
and any manual "Regenerate" action call — there must be exactly one code path that produces a
Final Amount Due, never duplicated logic in two places.

## 4.1 Deriving the calculation order from the worked examples

The requirements doc (§7) gives two worked examples but doesn't spell out the exact order of
operations — it explicitly says *"the programmer should implement one documented calculation order
consistently."* Reverse-engineering the doc's own numbers pins the order down exactly:

**Nia, Sep 2026** — two classes, $80 + $80 = $160 base tuition, family has 2+ active students:

```
Base Tuition                 = 160.00
Multi-Class Discount (5%)    = 160.00 * 0.05        = 8.00   → subtotal 152.00
Sibling Discount (5%)        = 152.00 * 0.05         = 7.60   → subtotal 144.40
Adjustment                   = 0.00
FINAL AMOUNT DUE             = 144.40   ✅ matches doc exactly
```

**Leia, Sep 2026** — one class, $80 base, sibling of Nia, minus a cancelled-session adjustment:

```
Base Tuition                 = 80.00
Multi-Class Discount         = 0.00   (only one applicable class)
Sibling Discount (5%)        = 80.00 * 0.05          = 4.00   → subtotal 76.00
Adjustment                   = -20.00 ("class cancelled Sept 14")
FINAL AMOUNT DUE             = 56.00   ✅ matches doc exactly
```

**Documented order (this is the one, consistent path):**

```
1. Base Tuition        = sum of this month's ClassMonthlyFee amounts for the student's
                          ACTIVE enrollments where Class.discountEligible = true
                          (non-discount-eligible classes, e.g. flat seasonal programs,
                          are added to Base Tuition but excluded from the multi-class
                          discount calc — see 4.3)
2. Multi-Class Discount = IF student has 2+ discount-eligible active enrollments this month:
                          discountEligibleSubtotal * multiClassDiscountPct   (else 0)
3. Subtotal A           = Base Tuition − Multi-Class Discount
4. Sibling Discount     = IF family has 2+ active students this month:
                          Subtotal A * siblingDiscountPct   (else 0)
5. Subtotal B           = Subtotal A − Sibling Discount
6. Final Amount Due     = Subtotal B + Adjustment   (adjustment is a signed value, e.g. +20 or -20)
```

Both discount percentages default to 5% (`0.05`) but are read from `Settings`/env, never hard-coded,
per [01-architecture-and-tech-stack.md](./01-architecture-and-tech-stack.md).

## 4.2 Eligibility rules, spelled out

- **Active student**: `Student.isActive = true` AND has at least one `Enrollment` with
  `status = ACTIVE` whose `startDate <= end of billing month` and (`endDate IS NULL` OR
  `endDate >= start of billing month`).
- **Active enrollment for a given month**: same date-overlap rule as above, scoped to one
  enrollment.
- **Multi-class discount eligibility**: counts only enrollments whose `Class.discountEligible =
  true`. A student in two regular classes → discount applies. A student in one regular class + one
  seasonal flat-fee program (e.g., "Onam Dance 2026," which the admin has flagged as
  `discountEligible = false`) → discount does **not** apply, since that's not really "two classes"
  in the pricing sense the doc intends. This is a configurable flag, not a hard-coded exclusion —
  the admin can toggle it per class in `/admin/classes/[id]/edit`.
- **Sibling discount eligibility**: family has 2+ students where `Student.isActive = true` **and**
  that student has at least one active enrollment in the billing month (a sibling who has fully
  withdrawn shouldn't make an otherwise-only-child eligible for a discount they no longer share
  with anyone). Every qualifying sibling gets the discount on their own Subtotal A — not split,
  not based on family total.
- **Both discounts can apply to the same student** (confirmed by the Nia example) and are always
  computed in the fixed order above.

## 4.3 Base Tuition composition (Regular vs. Seasonal pricing)

For each active enrollment in the billing month:

1. Look up (or auto-create, if missing) the `ClassMonthlyFee` row for `(classId, month)`.
2. If it doesn't exist yet, derive it from the `Class` record:
   - **REGULAR**: `monthlyClassFee = billableSessions * rate`. `billableSessions` for a newly
     generated month defaults to the count of scheduled weekdays for that class's `dayOfWeek`
     falling within the month (a simple calendar calculation) — the admin can override this before
     or after generation for cancellations/holidays/extra sessions, per §5's explicit requirement
     that overrides must be possible.
   - **SEASONAL**: `monthlyClassFee = flatFee` (admin sets `flatFee` directly on the Class or on
     the specific month's fee row — there is no session-count math for flat-fee programs).
3. Create a `MonthlyBillingLineItem` linking this enrollment + this `ClassMonthlyFee` + the amount
   contributed, so every dollar in Base Tuition is traceable back to a specific class-month fee
   (this is what powers the bill-detail audit view in
   [03-routes-and-pages.md §3.9](./03-routes-and-pages.md#39-monthly-student-billing-adminbilling-the-critical-page-6)).

## 4.4 Adjustments (§8)

A signed decimal (`+20.00` or `-20.00`) plus a **required** note whenever non-zero, applied last,
after both discounts. Editing an adjustment:

- Only allowed while the bill has `status IN (DRAFT, UNPAID, PARTIAL)` — once fully `PAID`, an
  adjustment requires an explicit "reopen bill" confirmation (prevents silently changing a bill a
  parent has already been told is settled).
- Always recomputes `finalAmountDue` and cascades to `balance`/`status` immediately.
- Never touches the Class's standard rate or any other month's `ClassMonthlyFee` — strictly a
  one-bill, one-month change, exactly as required.

## 4.5 Monthly generation job — idempotency rules

`generateMonthlyBilling(month)` (called by both the cron job and the manual "Generate Bills"
button):

1. Compute the set of "should have a bill" students for `month` (active students with an active
   enrollment overlapping the month).
2. For each: `upsert` on the unique `(studentId, month)` key.
   - **If no row exists**: create it, running the full calculation in §4.1.
   - **If a row exists with `status = DRAFT` or `UNPAID` and zero linked Payments**: recompute and
     overwrite (safe — nothing has been communicated or collected against the old numbers yet).
   - **If a row exists with any linked Payment, or `status = PARTIAL`/`PAID`/`OVERPAID`**: leave it
     untouched and report it in the job's summary as "skipped — has payments." This is the guard
     that prevents a re-run from ever silently changing a bill a parent has already paid against.
3. Return a summary: `{ created: n, updated: n, skipped: n, students: [...] }`, shown to the admin
   after a manual trigger and logged (not emailed) after the scheduled cron run.

## 4.6 Worked sample cases (mirrors §16's required test matrix)

These become the actual Vitest unit test cases for `computeStudentBilling`:

| Case | Setup | Expected Final Amount Due |
|---|---|---|
| One-class student | 1 enrollment, $80 regular class, only child | $80.00 − sibling(0) − multi(0) = $80.00 |
| Multi-class student | 2 enrollments, $80 + $80, only child | $160 − multi(8) = $152.00 |
| Siblings (both single-class) | 2 students, $80 each, same family | $80 − sibling(4) = $76.00 each |
| Siblings + multi-class (Nia/Leia) | as in §7 examples | $144.40 and $56.00 (with Leia's -$20 adjustment) |
| Seasonal flat-fee class | 1 enrollment, `pricingType = SEASONAL`, `flatFee = 45` | $45.00, unaffected by session-count logic |
| Cancelled-session adjustment | base bill + `-20.00` adjustment with required note | base − 20 |
| Partial payment | bill with `finalAmountDue = 100`, one `Payment` of `40` | `amountPaid=40`, `balance=60`, `status=PARTIAL` |
| Full payment | bill with `finalAmountDue = 100`, payments summing to `100` | `status=PAID`, `balance=0` |
| Overpayment | payments summing to `> finalAmountDue` | `status=OVERPAID`, `balance` negative, flagged for admin review |
