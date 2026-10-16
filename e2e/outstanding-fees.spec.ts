// Browser test for the admin Outstanding Fees page (/admin/billing/outstanding), on desktop and
// mobile. Run with `npm run test:e2e:outstanding`.
//
// Read-only for billing data: it compares what the page shows with the bills in the configured
// database and never records, edits or deletes anything there. The one write is a temporary STAFF
// sign-in tagged with this run's E2E-<id>, created in beforeAll and deleted in afterAll
// (e2e/fixtures/admin-db-cli.ts); afterAll also confirms no tagged sign-in is left behind.
import { randomBytes } from "node:crypto";

import { expect, test, type Page } from "@playwright/test";

import { runFixtureCli } from "./helpers";

const FIXTURE = "e2e/fixtures/admin-db-cli.ts";
const TAG = `E2E-${Date.now().toString(36)}`;
const PASSWORD = randomBytes(18).toString("base64url");
const EMAIL = `${TAG.toLowerCase()}@e2e.example.test`;
const PAGE_PATH = "/admin/billing/outstanding";

type Totals = { bills: number; students: number; due: number; withPositiveAdjustment: number };
let expected: Totals;

const money = (text: string) => Number(text.replace(/[^0-9.-]/g, ""));
// The amount at the end of a summary such as "6 students still owe for 2026 Bollywood 11:30-12:30: $911.50"
// (class names can contain colons).
const amountAtEnd = (text: string) => /\$[\d,]+\.\d{2}$/.exec(text.trim())?.[0] ?? "NaN";
const currency = (amount: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

test.describe.configure({ mode: "serial" });

test.beforeAll(() => {
  runFixtureCli(FIXTURE, "create-staff", { tag: TAG, password: PASSWORD });
  expected = runFixtureCli<Totals>(FIXTURE, "outstanding-totals", { tag: TAG });
});

test.afterAll(() => {
  const result = runFixtureCli<{ users: number; remaining: number }>(FIXTURE, "cleanup", { tag: TAG });
  expect(result).toEqual({ users: 1, remaining: 0 });
});

async function signIn(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email", { exact: true }).fill(EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/, { timeout: 90_000 });
}

// Every row's class amounts add up to its "Still due" (columns: student, family, month, classes, paid, due).
async function expectRowsBalance(page: Page) {
  const rows = await page.locator("tbody tr").evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll("td")].map((td) => (td as HTMLElement).innerText)));
  expect(rows.length).toBeGreaterThan(0);
  for (const cells of rows) {
    const classSum = [...cells[3].matchAll(/\$([\d,]+\.\d{2})/g)].reduce((sum, match) => sum + Number(match[1].replace(/,/g, "")), 0);
    expect(Math.round(classSum * 100)).toBe(Math.round(money(cells[5]) * 100));
  }
  return rows;
}

for (const [label, viewport] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]] as const) {
  test.describe(label, () => {
    test.use({ viewport });

    test("opens from the dashboard and shows every outstanding bill's total", async ({ page }) => {
      await signIn(page);
      await page.getByText("Unpaid / Partial bills").click();
      await page.waitForURL(new RegExp(`${PAGE_PATH}$`), { timeout: 90_000 });

      const studentLabel = `${expected.students} ${expected.students === 1 ? "student" : "students"}`;
      await expect(page.getByText(`${studentLabel} have fees still due: ${currency(expected.due)}`)).toBeVisible();
      await expect(page.getByText(`${expected.bills} ${expected.bills === 1 ? "bill" : "bills"}`, { exact: true })).toBeVisible();
      await expect(page.getByLabel("Class", { exact: true })).toContainText("All classes");

      // The server already supplied the data, so loading the page must not fetch it a second time
      // (a server-action POST). Each duplicate doubled the database connections a visit used.
      const refetches: string[] = [];
      page.on("request", (request) => {
        // Only this page's data request carries a pageSize argument (the bell and sidebar make their own).
        if (request.method() === "POST" && request.headers()["next-action"] && request.postData()?.includes("pageSize")) refetches.push(request.url());
      });
      await page.reload();
      await expect(page.getByText(`${studentLabel} have fees still due: ${currency(expected.due)}`)).toBeVisible();
      await page.waitForLoadState("networkidle");
      expect(refetches).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
      await expectRowsBalance(page);
    });

    test("pages through the list with the page in the URL", async ({ page }) => {
      test.skip(expected.bills <= 10, "Needs more than 10 outstanding bills to page.");
      await signIn(page);
      await page.goto(PAGE_PATH);
      await page.getByRole("combobox").last().click();
      await page.getByRole("option", { name: "10", exact: true }).click();
      await page.waitForURL(/pageSize=10/);
      const pages = Math.ceil(expected.bills / 10);
      await expect(page.getByText(`Page 1 of ${pages} (${expected.bills} bills)`)).toBeVisible();
      await expect(page.locator("tbody tr")).toHaveCount(10);
      const firstOnPageOne = await page.locator("tbody tr").first().innerText();

      await page.getByRole("button", { name: "Next", exact: true }).click();
      await page.waitForURL(/page=2/);
      await expect(page.getByText(`Page 2 of ${pages} (${expected.bills} bills)`)).toBeVisible();
      await expect(page.locator("tbody tr").first()).not.toHaveText(firstOnPageOne);
      await expectRowsBalance(page);
    });

    test("filters by class with the class in the URL", async ({ page }) => {
      await signIn(page);
      await page.goto(`${PAGE_PATH}?pageSize=100`);
      await page.getByLabel("Class", { exact: true }).click();
      const option = page.getByRole("option").nth(1);
      const className = (await option.innerText()).trim();
      await option.click();
      await page.waitForURL(/classId=/);

      const summary = page.getByText(new RegExp(`still owe for ${className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}:`));
      await expect(summary).toBeVisible();
      const rows = await expectRowsBalance(page);
      const classTotal = rows.reduce((sum, cells) => {
        const match = new RegExp(`${className.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\$([\\d,]+\\.\\d{2})`).exec(cells[3]);
        return sum + Number(match?.[1].replace(/,/g, "") ?? 0);
      }, 0);
      expect(Math.round(classTotal * 100)).toBe(Math.round(money(amountAtEnd(await summary.innerText())) * 100));
    });
  });
}

test("class totals add up to the overall amount without overlap", async ({ page }) => {
  await signIn(page);
  await page.goto(PAGE_PATH);
  await page.getByLabel("Class", { exact: true }).click();
  const optionCount = await page.getByRole("option").count();
  await page.keyboard.press("Escape");

  let sumOfClasses = 0;
  for (let index = 1; index < optionCount; index++) {
    const before = page.url();
    await page.getByLabel("Class", { exact: true }).click();
    await page.getByRole("option").nth(index).click();
    await page.waitForURL((url) => url.href !== before && url.searchParams.has("classId"));
    const summary = page.getByText(/still owe for .+: \$/);
    await expect(summary).toBeVisible();
    sumOfClasses += money(amountAtEnd(await summary.innerText()));
  }
  // A positive bill adjustment is owed as its own line, outside any class; without one the class
  // totals must equal the overall amount to the cent.
  if (expected.withPositiveAdjustment === 0) expect(Math.round(sumOfClasses * 100)).toBe(Math.round(expected.due * 100));
  else expect(Math.round(sumOfClasses * 100)).toBeLessThan(Math.round(expected.due * 100));
});
