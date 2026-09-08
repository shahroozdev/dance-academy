import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const directory = path.dirname(fileURLToPath(import.meta.url));
const shots = path.join(directory, "screenshots");
await fs.mkdir(shots, { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1.5 });
const page = await context.newPage();
const base = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";
const extraOnly = process.argv.includes("--extra");
const inventory = extraOnly ? JSON.parse(await fs.readFile(path.join(directory, "screen-inventory.json"), "utf8")) : [];
async function settle() {
  await page.waitForLoadState("networkidle");
  await page.locator('[data-slot="skeleton"]').first().waitFor({ state: "hidden", timeout: 30000 }).catch(() => {});
  await page.evaluate(() => document.fonts.ready);
}
async function capture(name, route) {
  if (route) await page.goto(`${base}${route}`);
  await settle();
  if ((await page.locator("body").innerText()).includes("Something went wrong")) throw new Error(`App error on ${name}; screenshot was not saved.`);
  await page.addStyleTag({ content: 'nextjs-portal { display:none!important; }' });
  // Hide configured account identifiers in screenshots, without changing saved settings.
  if (name === "settings-integrations") {
    await page.locator('input').evaluateAll(inputs => inputs.forEach(input => { if (input.value) input.value = "[Configured by administrator]"; }));
  }
  await page.screenshot({ path: path.join(shots, `${name}.png`), fullPage: true });
  const dialog = page.getByRole("dialog");
  if (await dialog.count()) await dialog.screenshot({ path: path.join(shots, `${name}-focus.png`) });
  inventory.push({ name, route: new URL(page.url()).pathname, text: await page.locator("body").innerText(), links: await page.locator('a[href^="/admin/"]').evaluateAll(links => links.map(a => ({ text: a.textContent, href: a.getAttribute("href") }))) });
  await fs.writeFile(path.join(directory, "screen-inventory.json"), JSON.stringify(inventory, null, 2));
  console.warn(`Captured ${name}`);
}
try {
  await capture("login", "/admin/login");
  if (!process.env.SEED_OWNER_EMAIL || !process.env.SEED_OWNER_PASSWORD) throw new Error("Set SEED_OWNER_EMAIL and SEED_OWNER_PASSWORD to an existing authorized account before capturing.");
  const candidates = [[process.env.SEED_OWNER_EMAIL, process.env.SEED_OWNER_PASSWORD]];
  for (const [email, password] of candidates) {
    await page.getByLabel("Email", { exact: true }).fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.waitForURL(url => url.pathname === "/admin", { timeout: 12000 }).catch(() => {});
    if (new URL(page.url()).pathname === "/admin") break;
  }
  if (new URL(page.url()).pathname !== "/admin") throw new Error("An active admin login is required for screenshots.");
  for (const [name, route] of [
    ["dashboard", "/admin"], ["families", "/admin/families"], ["students", "/admin/students"],
    ["teachers", "/admin/teachers"], ["classes", "/admin/classes"], ["enrollments", "/admin/enrollments"],
    ["registrations", "/admin/registrations"], ["billing", "/admin/billing"], ["class-fees", "/admin/class-fees"],
    ["payments", "/admin/payments"], ["expenses", "/admin/expenses"], ["income", "/admin/income"],
    ["financial-report", "/admin/reports/financials"], ["notifications", "/admin/notifications"],
    ["settings-appearance", "/admin/settings"],
  ]) if (!extraOnly) await capture(name, route);
  for (const [name, tab] of extraOnly ? [] : [["settings-billing", "Billing"], ["settings-integrations", "Integrations"], ["settings-emails", "Email Templates"]]) {
    await page.getByRole("tab", { name: tab, exact: true }).click();
    await capture(name);
  }
  if (!extraOnly) await capture("registration-form", "/register");
  for (const [name, route] of [["new-family", "/admin/families/new"], ["new-student", "/admin/students/new"], ["new-teacher", "/admin/teachers/new"], ["new-class", "/admin/classes/new"]]) await capture(name, route);
  for (const [name, source, prefix] of [["family-detail", "families", "/admin/families/"], ["student-detail", "students", "/admin/students/"], ["teacher-detail", "teachers", "/admin/teachers/"], ["class-detail", "classes", "/admin/classes/"]]) {
    const link = inventory.find(item => item.name === source)?.links.find(link => link.href.startsWith(prefix) && !link.href.endsWith("/new"));
    if (link) await capture(name, link.href);
  }
  for (const [name, route, button] of [["add-enrollment", "/admin/enrollments", "Add Enrollment"], ["review-registration", "/admin/registrations", "Review"], ["import-students", "/admin/students", "Import CSV"], ["add-expense", "/admin/expenses", "Add Expense"], ["add-income", "/admin/income", "Add Income"]]) {
    await page.goto(`${base}${route}`);
    await settle();
    const trigger = page.getByRole("button", { name: button, exact: true }).first();
    if (await trigger.count()) {
      await trigger.click();
      await capture(name);
    }
  }
} finally {
  await browser.close();
}
