import "dotenv/config";

import { expect, test, type Page } from "@playwright/test";

import {
  BILLING_COLUMN,
  billingCell,
  billingRow,
  formatCurrency,
  parseCurrency,
  rowValue,
  runDbCli,
  selectNativeByLabel,
  selectRadixOption,
} from "./helpers";

// Full acceptance-flow E2E test — docs/08-testing-and-acceptance.md §8.2, which itself mirrors
// the requirements doc's §15 "Definition of Done" checklist as one continuous scripted flow.
// Runs against a real running Next.js server and a real Postgres database (no mocks). The only
// direct-database work is the one-time fixture setup (two classes) and final teardown, both via
// e2e/fixtures/db-cli.ts — everything else, including every id this test needs (family, student,
// bill), is discovered and driven through the actual browser UI, the same way an admin would use
// it, right down to reading a freshly created record's id off the resulting URL.
//
// Money math below (multi-class/sibling discounts, adjustment) is intentionally hand-computed
// and asserted exactly — it's a second, independent check on top of the already-passing unit
// tests in src/lib/billing.test.ts, not a replacement for them. Financial-report totals (steps
// 14-16) are asserted as *deltas* (before vs. after) rather than exact figures, since this suite
// runs against a shared dev database that may already hold other data.

const RUN_ID = Date.now().toString(36);
const CLASS_A_NAME = `E2E Ballet ${RUN_ID}`;
const CLASS_B_NAME = `E2E Jazz ${RUN_ID}`;
const PARENT_NAME = `Priya E2E${RUN_ID}`;
const STUDENT1_NAME = `Nia E2E${RUN_ID}`;
const STUDENT2_NAME = `Leia E2E${RUN_ID}`;
const PARENT_PHONE = `555${Date.now().toString().slice(-7)}`;
const PARENT_EMAIL = `e2e-${RUN_ID}@example.test`;
const EXPENSE_DESCRIPTION = `E2E rent ${RUN_ID}`;

const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? "owner@malhaardance.example";
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "changeme123";

// Class A: 4 sessions/mo * $100 = $400. Class B: 4 sessions/mo * $50 = $200. Both classes leave
// `dayOfWeek` unset, which pins the billable-session count to a fixed 4 (src/lib/billing.ts) —
// deterministic regardless of which real-world month this suite happens to run in.
const CLASS_A_RATE = 100;
const CLASS_B_RATE = 50;
const CLASS_A_FEE = 4 * CLASS_A_RATE;
const CLASS_B_FEE = 4 * CLASS_B_RATE;

let classAId: string;
let classBId: string;

test.beforeAll(() => {
  const result = runDbCli<{ classAId: string; classBId: string }>("setup", {
    ownerEmail: OWNER_EMAIL,
    ownerPassword: OWNER_PASSWORD,
    classAName: CLASS_A_NAME,
    classADanceStyle: "Ballet",
    classARate: CLASS_A_RATE,
    classBName: CLASS_B_NAME,
    classBDanceStyle: "Jazz",
    classBRate: CLASS_B_RATE,
  });
  classAId = result.classAId;
  classBId = result.classBId;
});

test.afterAll(() => {
  runDbCli("cleanup", {
    phone: PARENT_PHONE,
    expenseDescription: EXPENSE_DESCRIPTION,
    classIds: [classAId, classBId].filter(Boolean),
  });
});

test("full acceptance flow (docs/08 §8.2)", async ({ page }) => {
  test.setTimeout(180_000);

  // Signed in up front (not part of the doc's numbered steps, but the financial-report baseline
  // reads just below need an authenticated session, and /register itself doesn't care either way
  // — it's a public route unaffected by an admin session cookie being present in the browser).
  await signIn(page);

  // Baselines for the delta-based financial assertions in steps 14-16 — captured once, up front,
  // before this run adds any income/expense of its own.
  const monthlyBefore = await readFinancialSummary(page, "MONTH");
  const yearlyBefore = await readFinancialSummary(page, "YEAR");
  const allTimeBefore = await readFinancialSummary(page, "ALL_TIME");

  await test.step("1. Submit /register as a parent for a new student in an existing class", async () => {
    await page.goto("/register");
    await page.getByLabel("Full Name", { exact: true }).fill(PARENT_NAME);
    await page.getByLabel("Email", { exact: true }).fill(PARENT_EMAIL);
    await page.getByLabel("Phone", { exact: true }).fill(PARENT_PHONE);
    await page.getByLabel("Student Full Name", { exact: true }).fill(STUDENT1_NAME);
    await page.getByLabel("Date of Birth", { exact: true }).fill("2015-05-05");
    await selectRadixOption(page, "Gender", "Female");
    await selectRadixOption(page, "Requested Class", `${CLASS_A_NAME} (Ballet)`);
    await page.getByLabel("Contact Name", { exact: true }).fill(`${PARENT_NAME} Emergency Contact`);
    await page.getByLabel("Relationship", { exact: true }).fill("Grandmother");
    await page.getByLabel("Emergency Phone", { exact: true }).fill(`555${Date.now().toString().slice(-6)}1`);
    await page.getByLabel(/agree to the studio's policies/i).check();

    await page.getByRole("button", { name: "Submit Registration" }).click();
    await expect(page.getByText("Thank you!")).toBeVisible();
  });

  await test.step("2. Confirm the RegistrationRequest appears in /admin/registrations", async () => {
    await page.goto("/admin/registrations");
    await expect(page.getByRole("row", { name: new RegExp(STUDENT1_NAME) })).toBeVisible();
  });

  let familyId = "";
  let familyName = "";

  await test.step("3. Approve it; confirm the correct Family and Student are created/matched and an Enrollment exists", async () => {
    await page.getByRole("row", { name: new RegExp(STUDENT1_NAME) }).getByRole("button", { name: "Review" }).click();
    await expect(page.getByText(/create new/)).toHaveCount(2); // both family and student are new
    await page.getByRole("button", { name: "Approve & Process" }).click();
    await expect(page.getByRole("row", { name: new RegExp(STUDENT1_NAME) })).not.toBeVisible();

    // Find the newly created family (there's no id to jump to directly from the registrations
    // list) and, from there, confirm the enrollment the approval was supposed to create.
    await page.goto("/admin/families");
    await page.getByPlaceholder("Search families...").fill(RUN_ID);
    const familyRow = page.getByRole("row", { name: new RegExp(RUN_ID) });
    familyName = ((await familyRow.locator("td").first().textContent()) ?? "").trim();
    await familyRow.click();
    await page.waitForURL(/\/admin\/families\/[^/]+$/);
    familyId = page.url().split("/").pop() ?? "";

    const student1Entry = page.getByText(STUDENT1_NAME, { exact: true }).locator("..");
    await expect(student1Entry.getByText(CLASS_A_NAME)).toBeVisible();
  });

  await test.step("4. Trigger Generate Bills for the current month; confirm the new student has a bill with zero admin retyping", async () => {
    await page.goto("/admin/billing");
    await page.getByRole("button", { name: /Generate Bills for/ }).click();
    await expect(page.getByText(/created,.*updated,.*skipped/)).toBeVisible();

    await page.getByPlaceholder("Search student or family...").fill(RUN_ID);
    await page.getByRole("button", { name: new RegExp(familyName) }).click();
    await expect(billingCell(billingRow(page, STUDENT1_NAME), BILLING_COLUMN.finalAmountDue)).toHaveText(
      formatCurrency(CLASS_A_FEE),
    );
  });

  await test.step("5. Add a second enrollment for the same student in another class; regenerate; confirm the multi-class discount applies", async () => {
    await page.goto("/admin/enrollments");
    await page.getByRole("button", { name: "Add Enrollment" }).click();
    await selectNativeByLabel(page, "Student", `${STUDENT1_NAME} (${familyName})`);
    await selectNativeByLabel(page, "Class", `${CLASS_B_NAME} — Jazz`);
    await page.getByRole("button", { name: "Create Enrollment" }).click();
    await expect(page.getByRole("row", { name: new RegExp(CLASS_B_NAME) })).toBeVisible();

    await page.goto("/admin/billing");
    await page.getByRole("button", { name: /Generate Bills for/ }).click();
    await expect(page.getByText(/created,.*updated,.*skipped/)).toBeVisible();
    await page.getByPlaceholder("Search student or family...").fill(RUN_ID);
    await page.getByRole("button", { name: new RegExp(familyName) }).click();

    const row = billingRow(page, STUDENT1_NAME);
    const expectedMultiClassDiscount = round2((CLASS_A_FEE + CLASS_B_FEE) * 0.05);
    const expectedFinal = round2(CLASS_A_FEE + CLASS_B_FEE - expectedMultiClassDiscount);
    await expect(row.locator("td").nth(2)).toHaveText(`-${formatCurrency(expectedMultiClassDiscount)}`);
    await expect(billingCell(row, BILLING_COLUMN.finalAmountDue)).toHaveText(formatCurrency(expectedFinal));
  });

  await test.step("6. Add a second student to the same family; regenerate; confirm the sibling discount applies to both", async () => {
    await page.goto(`/admin/students/new?familyId=${familyId}`);
    await page.getByLabel("Student Name", { exact: true }).fill(STUDENT2_NAME);
    await page.getByRole("button", { name: "Create Student" }).click();
    await page.waitForURL(/\/admin\/students\/[^/]+$/);

    await page.goto("/admin/enrollments");
    await page.getByRole("button", { name: "Add Enrollment" }).click();
    await selectNativeByLabel(page, "Student", `${STUDENT2_NAME} (${familyName})`);
    await selectNativeByLabel(page, "Class", `${CLASS_A_NAME} — Ballet`);
    await page.getByRole("button", { name: "Create Enrollment" }).click();
    await expect(page.getByRole("row", { name: new RegExp(STUDENT2_NAME) })).toBeVisible();

    await page.goto("/admin/billing");
    await page.getByRole("button", { name: /Generate Bills for/ }).click();
    await expect(page.getByText(/created,.*updated,.*skipped/)).toBeVisible();
    await page.getByPlaceholder("Search student or family...").fill(RUN_ID);
    await page.getByRole("button", { name: new RegExp(familyName) }).click();

    const student1Row = billingRow(page, STUDENT1_NAME);
    const student1SiblingDiscount = round2((CLASS_A_FEE + CLASS_B_FEE - round2((CLASS_A_FEE + CLASS_B_FEE) * 0.05)) * 0.05);
    await expect(student1Row.locator("td").nth(3)).toHaveText(`-${formatCurrency(student1SiblingDiscount)}`);

    const student2Row = billingRow(page, STUDENT2_NAME);
    const student2SiblingDiscount = round2(CLASS_A_FEE * 0.05);
    await expect(student2Row.locator("td").nth(3)).toHaveText(`-${formatCurrency(student2SiblingDiscount)}`);
    await expect(billingCell(student2Row, BILLING_COLUMN.finalAmountDue)).toHaveText(
      formatCurrency(round2(CLASS_A_FEE - student2SiblingDiscount)),
    );
  });

  let student1FinalAmountDue = 0;

  await test.step("7. Add a one-month adjustment with a note; confirm Final Amount Due updates", async () => {
    // Cross-month isolation (this adjustment must not affect other months) is already covered by
    // src/lib/billing.test.ts's "one-month-only adjustment" case — not re-derived here via a
    // second month's worth of billing generation, which would just be redundant coverage.
    await page.getByRole("link", { name: STUDENT1_NAME }).click();
    await page.waitForURL(/\/admin\/billing\/[^/]+$/);
    await page.getByRole("button", { name: "Adjust" }).click();
    await page.getByLabel("Adjustment ($)", { exact: true }).fill("-20");
    await page.getByLabel("Note", { exact: true }).fill(`E2E test adjustment ${RUN_ID}`);
    await page.getByRole("button", { name: "Save Adjustment" }).click();

    const beforeAdjustment = round2(
      CLASS_A_FEE +
        CLASS_B_FEE -
        round2((CLASS_A_FEE + CLASS_B_FEE) * 0.05) -
        round2((CLASS_A_FEE + CLASS_B_FEE - round2((CLASS_A_FEE + CLASS_B_FEE) * 0.05)) * 0.05),
    );
    student1FinalAmountDue = round2(beforeAdjustment - 20);
    await expect(rowValue(page, "Adjustment")).toHaveText(`-${formatCurrency(20)}`);
    await expect(rowValue(page, "Final Amount Due")).toHaveText(formatCurrency(student1FinalAmountDue));
  });

  await test.step("8. Confirm Final Amount Due is prominent on both the billing workspace row and the bill detail page", async () => {
    await expect(rowValue(page, "Final Amount Due")).toHaveText(formatCurrency(student1FinalAmountDue));

    await page.goto("/admin/billing");
    await page.getByPlaceholder("Search student or family...").fill(RUN_ID);
    await page.getByRole("button", { name: new RegExp(familyName) }).click();
    await expect(
      billingCell(billingRow(page, STUDENT1_NAME), BILLING_COLUMN.finalAmountDue),
    ).toHaveText(formatCurrency(student1FinalAmountDue));
  });

  let familyMessage = "";

  await test.step("9. Generate the family-combined message text; confirm it matches the expected format and numbers", async () => {
    await page.getByRole("button", { name: "Notify" }).click();
    const message = page.locator("pre");
    await expect(message).toBeVisible();
    familyMessage = (await message.textContent()) ?? "";

    expect(familyMessage).toContain("Hi Priya,");
    expect(familyMessage).toContain(`${STUDENT1_NAME} – ${formatCurrency(student1FinalAmountDue)}`);
    expect(familyMessage).toContain(`${STUDENT2_NAME} – ${formatCurrency(round2(CLASS_A_FEE * 0.95))}`);
    expect(familyMessage).toContain(
      `Total family amount due: ${formatCurrency(round2(student1FinalAmountDue + round2(CLASS_A_FEE * 0.95)))}`,
    );
  });

  await test.step('10. Confirm the "Copy Message"/wa.me fallback produces correct text (WhatsApp send isn\'t automated yet)', async () => {
    const waLink = page.getByRole("link", { name: "Open in WhatsApp" });
    const href = await waLink.getAttribute("href");
    expect(href).toContain(`https://wa.me/1${PARENT_PHONE}`);
    expect(href).toContain(encodeURIComponent(familyMessage).slice(0, 40));

    await page.getByRole("button", { name: "Copy Message" }).click();
    await expect(page.getByRole("button", { name: "Copied!" })).toBeVisible();

    await page.getByRole("button", { name: "Mark as Sent" }).click();
    await expect(page.getByText("Send Notification")).not.toBeVisible();
  });

  await test.step("11. Record a partial payment; confirm amountPaid, balance, and status = PARTIAL update automatically", async () => {
    await page.getByRole("link", { name: STUDENT1_NAME }).click();
    await page.waitForURL(/\/admin\/billing\/[^/]+$/);
    // "Record Payment" labels both the page-level trigger and the modal's own submit button, so
    // the submit click must be scoped to the dialog to avoid matching the trigger behind it.
    await page.getByRole("button", { name: "Record Payment" }).click();
    const paymentDialog = page.getByRole("dialog");
    await paymentDialog.getByLabel("Amount ($)", { exact: true }).fill("300");
    await paymentDialog.getByRole("button", { name: "Record Payment" }).click();

    await expect(rowValue(page, "Amount Paid")).toHaveText(formatCurrency(300));
    await expect(rowValue(page, "Balance")).toHaveText(formatCurrency(round2(student1FinalAmountDue - 300)));
    await expect(rowValue(page, "Status")).toHaveText("PARTIAL");
  });

  await test.step("12. Record a second payment completing the balance; confirm status = PAID", async () => {
    await page.getByRole("button", { name: "Record Payment" }).click();
    // The payment modal defaults `amount` to the current balance, so submitting as-is pays it off.
    await page.getByRole("dialog").getByRole("button", { name: "Record Payment" }).click();

    await expect(rowValue(page, "Balance")).toHaveText(formatCurrency(0));
    await expect(rowValue(page, "Status")).toHaveText("PAID");
    await expect(page.getByRole("button", { name: "Record Payment" })).not.toBeVisible();
  });

  await test.step('13. Confirm the "Unpaid and partially paid students" list excludes the now-paid student and includes the still-outstanding one', async () => {
    await page.goto("/admin/billing");
    await page.getByPlaceholder("Search student or family...").fill(RUN_ID);
    // Default status filters are UNPAID/PARTIAL/OVERPAID — PAID is excluded already.
    await page.getByRole("button", { name: new RegExp(familyName) }).click();

    await expect(billingRow(page, STUDENT1_NAME)).not.toBeVisible();
    const student2Row = billingRow(page, STUDENT2_NAME);
    await expect(student2Row).toBeVisible();
    await expect(billingCell(student2Row, BILLING_COLUMN.status)).toHaveText("UNPAID");
  });

  await test.step('14. Confirm the payment appears in "Tuition/Payments Collected" for the month it was received, without a duplicate manual entry', async () => {
    const monthlyAfter = await readFinancialSummary(page, "MONTH");
    expect(round2(monthlyAfter.tuitionCollected - monthlyBefore.tuitionCollected)).toBe(student1FinalAmountDue);
  });

  await test.step("15. Add an Expense (e.g., rent); confirm it appears in Total Expenses for the correct month", async () => {
    await page.goto("/admin/expenses");
    await page.getByRole("button", { name: "Add Expense" }).click();
    await selectRadixOption(page, "Category", "Studio Rent");
    await page.getByLabel("Description", { exact: true }).fill(EXPENSE_DESCRIPTION);
    await page.getByLabel("Amount ($)", { exact: true }).fill("250");
    await selectRadixOption(page, "Payment Method", "Cash");
    await page.getByRole("button", { name: "Save Expense" }).click();
    await expect(page.getByText(EXPENSE_DESCRIPTION)).toBeVisible();

    const monthlyAfterExpense = await readFinancialSummary(page, "MONTH");
    expect(round2(monthlyAfterExpense.totalExpenses - monthlyBefore.totalExpenses)).toBe(250);
  });

  await test.step("16. Confirm Monthly, Yearly, and All-Time Net Profit all calculate correctly and consistently", async () => {
    // Exact month-by-month summation is already unit-tested (src/lib/period.test.ts). What this
    // step checks end-to-end is that the same real activity this run just performed shows up
    // consistently across all three periods, via the delta each period moved by.
    const expectedNetProfitDelta = round2(student1FinalAmountDue - 250);

    const monthlyAfter = await readFinancialSummary(page, "MONTH");
    expect(round2(monthlyAfter.netProfit - monthlyBefore.netProfit)).toBe(expectedNetProfitDelta);

    const yearlyAfter = await readFinancialSummary(page, "YEAR");
    expect(round2(yearlyAfter.netProfit - yearlyBefore.netProfit)).toBe(expectedNetProfitDelta);

    const allTimeAfter = await readFinancialSummary(page, "ALL_TIME");
    expect(round2(allTimeAfter.netProfit - allTimeBefore.netProfit)).toBe(expectedNetProfitDelta);
  });
});

// ---------- shared step helpers ----------

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function signIn(page: Page): Promise<void> {
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(OWNER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/);
}

type FinancialSummary = { tuitionCollected: number; totalExpenses: number; netProfit: number };

const PERIOD_TAB_LABEL: Record<"MONTH" | "YEAR" | "ALL_TIME", string> = {
  MONTH: "Monthly",
  YEAR: "Yearly",
  ALL_TIME: "All-Time",
};

async function readFinancialSummary(page: Page, period: "MONTH" | "YEAR" | "ALL_TIME"): Promise<FinancialSummary> {
  await page.goto("/admin/reports/financials");
  await page.getByRole("button", { name: PERIOD_TAB_LABEL[period], exact: true }).click();
  await expect(rowValue(page, "NET PROFIT")).toBeVisible();

  const [tuitionCollected, totalExpenses, netProfit] = await Promise.all([
    rowValue(page, "Tuition/Payments Collected").textContent(),
    rowValue(page, "TOTAL EXPENSES").textContent(),
    rowValue(page, "NET PROFIT").textContent(),
  ]);

  return {
    tuitionCollected: parseCurrency(tuitionCollected ?? "0"),
    totalExpenses: parseCurrency(totalExpenses ?? "0"),
    netProfit: parseCurrency(netProfit ?? "0"),
  };
}
