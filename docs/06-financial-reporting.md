# 6. Financial Reporting (§11)

## 6.1 Core principle: Billed vs. Collected

The doc is explicit and this is easy to get wrong: **Monthly Student Billing tells you what's
DUE; the financial dashboard reports what's actually RECEIVED.** These are deliberately different
numbers and both must remain visible:

- `MonthlyStudentBilling.finalAmountDue` (grouped by `month`) = **billed revenue** — shown in the
  billing workspace, not the financial dashboard.
- `Payment.amount` (grouped by `Payment.paymentDate`, regardless of which month the underlying bill
  was for) = **cash actually collected** — this is what feeds "Tuition/Payments Collected" on the
  financial dashboard.

This matters concretely: a payment received in October against September's bill counts as October
income, not September income, because income reporting uses the payment received date (§11, final
paragraph). A studio owner reconciling against their actual bank deposits needs this distinction —
"billed" and "collected" diverging is normal and expected, not a bug.

## 6.2 Income composition

```
Total Income (period) =
    SUM(Payment.amount WHERE paymentDate IN period)          -- tuition, actually collected
  + SUM(OtherIncome.amount WHERE date IN period)              -- registration fees, workshops,
                                                                  performance fees, costume income,
                                                                  private lessons, misc (§11.1)
```

## 6.3 Expense composition

```
Total Expenses (period) = SUM(Expense.amount WHERE date IN period)
```
grouped by `ExpenseCategory` for the itemized breakdown (Studio Rent; Instructor/Choreographer
Payments; Costumes; Jewelry/Props; Competition/Event Fees; Advertising; Software/Subscriptions;
Music/Editing; Supplies; Travel; Miscellaneous — §11.2).

## 6.4 Net Profit

```
Net Profit (period) = Total Income (period) − Total Expenses (period)
```

## 6.5 Period handling

- **Monthly**: `period = [firstOfMonth, firstOfNextMonth)`.
- **Yearly**: `period = [Jan 1 of selected year, Jan 1 of next year)`.
- **All-Time**: no lower bound; upper bound is "now."
- The year selector on `/admin/reports/financials` is populated by
  `SELECT DISTINCT EXTRACT(YEAR FROM date) FROM (Payment.paymentDate UNION Expense.date UNION
  OtherIncome.date)`, union'd with the current calendar year, so a brand-new year with zero
  transactions yet still appears as selectable — satisfying the "select 2026, 2027, etc. without
  creating a new system each year" requirement with zero manual setup per year.

## 6.6 No double-counting

Because tuition income is derived exclusively from `Payment` rows and never separately re-entered
as an "income" line item, there is no code path that can double-count a student's payment — this
was an explicit requirement (§11.1, "so tuition income is not entered twice"). `OtherIncome` is a
structurally separate table specifically so it can never overlap with `Payment`-derived tuition
income.
