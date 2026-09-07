import { execFileSync } from "node:child_process";

import type { Locator, Page } from "@playwright/test";

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function parseCurrency(text: string): number {
  return Number(text.replace(/[^0-9.-]/g, ""));
}

// Matches the `<div><span>{label}</span><span>{value}</span></div>` "Row" pattern used on the
// billing detail page and the financial reports summary card — the value is always the label's
// very next sibling <span>, including when that sibling is a <Badge> (a styled <span>).
export function rowValue(page: Page, label: string): Locator {
  return page.getByText(label, { exact: true }).locator("xpath=following-sibling::span[1]");
}

// The app's `FormFeilds`/`Input` common component renders every select as a Radix combobox
// (role="combobox") associated with its <FieldLabel htmlFor>, so it opens/selects like this
// everywhere it's used (register form, expense modal, etc.) — distinct from the enrollments
// page's plain native <select>, which needs `selectNativeByLabel` below instead.
export async function selectRadixOption(page: Page, labelText: string, optionText: string): Promise<void> {
  await page.getByLabel(labelText, { exact: true }).click();
  await page.getByRole("option", { name: optionText, exact: true }).click();
}

// The "Add Enrollment" modal's <select> elements have a <label> with no `htmlFor`, so
// getByLabel() can't find them by accessible name — locate by DOM adjacency instead.
export async function selectNativeByLabel(page: Page, labelText: string, optionLabel: string): Promise<void> {
  const select = page.getByText(labelText, { exact: true }).locator("xpath=following-sibling::select[1]");
  await select.selectOption({ label: optionLabel });
}

export function billingRow(page: Page, studentName: string): Locator {
  return page.getByRole("row", { name: new RegExp(studentName) });
}

// 0-indexed against the billing workspace table's <TableHead> order: Student, Classes,
// Multi-Class Disc., Sibling Disc., Adjustment, Final Amount Due, Paid, Balance, Status, actions.
export const BILLING_COLUMN = {
  finalAmountDue: 5,
  paid: 6,
  balance: 7,
  status: 8,
} as const;

export function billingCell(row: Locator, column: number): Locator {
  return row.locator("td").nth(column);
}

// Runs e2e/fixtures/db-cli.ts as a subprocess (see that file for why) and returns its parsed
// JSON result. Synchronous — only used for one-time setup and final teardown, not per-step, so
// the subprocess-spawn cost doesn't add up. The payload crosses as base64 (not a raw JSON string)
// so `shell: true` — needed to resolve `npx` on Windows — can't mangle its quotes/spaces.
export function runDbCli<T>(command: "setup" | "cleanup", payload: unknown): T {
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64");
  const output = execFileSync("npx", ["tsx", "e2e/fixtures/db-cli.ts", command, payloadB64], {
    encoding: "utf8",
    shell: true,
  });
  const lastLine = output.trim().split("\n").pop() ?? "{}";
  return JSON.parse(lastLine) as T;
}
