import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const dir = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const email = process.env.CONTENT_OWNER_EMAIL;
const password = process.env.CONTENT_OWNER_PASSWORD;

if (!email || !password) throw new Error("CONTENT_OWNER_EMAIL and CONTENT_OWNER_PASSWORD are required to capture the manual.");

const screens = [
  ["overview", "/content"],
  ["festivals", "/content/festivals"],
  ["performances", "/content/performances"],
  ["press", "/content/press"],
  ["profiles", "/content/profiles"],
  ["media", "/content/media"],
  ["inquiries", "/content/inquiries"],
  ["settings", "/content/settings"],
  ["users", "/content/users"],
  ["history", "/content/history"],
  ["festival-form", "/content/festivals/new"],
  ["performance-form", "/content/performances/new"],
  ["press-form", "/content/press/new"],
  ["profile-form", "/content/profiles/new"],
  ["media-upload", "/content/media", "Upload File"],
  ["user-form", "/content/users", "Add User"],
];
const requestedNames = process.argv.slice(2);
const requestedScreens = requestedNames.length > 0 ? screens.filter(([name]) => requestedNames.includes(name)) : screens;

if (requestedNames.length > 0 && requestedScreens.length !== requestedNames.length) throw new Error("Unknown screenshot name requested.");

const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1 });
  await fs.mkdir(path.join(dir, "screenshots"), { recursive: true });
  await page.goto(`${baseUrl}/content/login`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(dir, "screenshots", "login.png"), fullPage: true });
  await page.getByLabel("Email").fill(email);
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/content$/);
  for (const [name, pathname, dialogButton] of requestedScreens) {
    await page.goto(`${baseUrl}${pathname}`, { waitUntil: "networkidle" });
    if (dialogButton) await page.getByRole("button", { name: dialogButton }).click();
    await page.screenshot({ path: path.join(dir, "screenshots", `${name}.png`) });
  }
  console.warn(`Captured ${requestedScreens.length + 1} read-only Content Portal screenshots.`);
} finally {
  await browser.close();
}
