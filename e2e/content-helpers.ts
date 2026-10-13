import { execFileSync } from "node:child_process";

import { expect, type Locator, type Page } from "@playwright/test";

// Shared by the public-site and Content Portal suites.

/** Runs e2e/fixtures/content-db-cli.ts and returns its parsed JSON result (see that file). */
export function runContentDbCli<T>(command: "seed-inquiry" | "cleanup", payload: { tag: string }): T {
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64");
  const output = execFileSync("npx", ["tsx", "e2e/fixtures/content-db-cli.ts", command, payloadB64], {
    encoding: "utf8",
    shell: true,
  });
  return JSON.parse(output.trim().split("\n").pop() ?? "{}") as T;
}

/**
 * A form field by its field name. Every field built with the app's `FormFeilds` carries the name
 * as its id; this is steadier than matching the label, whose text gains a "*" when required.
 */
export const field = (scope: Page | Locator, name: string) => scope.locator(`[id="${name}"]`);

export async function signInToContent(page: Page, email: string, password: string) {
  await page.goto("/content/login");
  await field(page, "email").fill(email);
  await field(page, "password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

export async function signOutOfContent(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/content\/login/);
}

/** Opens a Radix select by its label and picks an option. */
export async function chooseOption(page: Page, label: string, option: string) {
  await page.getByLabel(label, { exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}

/** The HTTP status a signed-out visitor gets for a public address. */
export async function publicStatus(page: Page, path: string) {
  const response = await page.request.get(path, { maxRedirects: 0 });
  return response.status();
}
