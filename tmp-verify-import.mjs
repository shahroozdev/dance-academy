import { chromium } from "playwright";

const BASE_URL = "http://localhost:3000";
const OWNER_EMAIL = process.env.SEED_OWNER_EMAIL ?? "owner@malhaardance.example";
const OWNER_PASSWORD = process.env.SEED_OWNER_PASSWORD ?? "changeme123";
const OUT_DIR = "C:\\Users\\HASHMI\\AppData\\Local\\Temp\\claude\\d--trycatchsolution-Malhaar-Dance-Company\\38db5548-e0f2-4356-823e-4d50ebfd4d35\\scratchpad";

const browser = await chromium.launch();
const page = await browser.newPage();
const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});
page.on("pageerror", (err) => consoleErrors.push(String(err)));
page.on("response", async (res) => {
  if (res.url().includes("/api/auth")) {
    console.log("AUTH_RESPONSE", res.status(), res.url());
  }
});

try {
  await page.goto(`${BASE_URL}/admin/login`, { waitUntil: "networkidle" });
  await page.getByLabel("Email", { exact: true }).fill(OWNER_EMAIL);
  await page.getByLabel("Password", { exact: true }).fill(OWNER_PASSWORD);
  await Promise.all([
    page.waitForLoadState("networkidle"),
    page.getByRole("button", { name: /sign in|log in/i }).click(),
  ]);
  await page.waitForTimeout(1500);
  console.log("URL_AFTER_SUBMIT", page.url());
  const bodyText = await page.locator("body").innerText();
  console.log("BODY_TEXT", bodyText.slice(0, 500));
  await page.screenshot({ path: `${OUT_DIR}\\after-submit.png` });

  if (page.url().includes("/admin/login")) {
    console.log("RESULT: LOGIN_FAILED");
    process.exitCode = 1;
  } else {
    await page.goto(`${BASE_URL}/admin/students`, { waitUntil: "networkidle" });
    await page.waitForSelector("text=Students", { timeout: 15000 });
    await page.screenshot({ path: `${OUT_DIR}\\students-page.png` });
    console.log("STUDENTS_PAGE_LOADED");

    const importButton = page.getByRole("button", { name: "Import CSV" });
    await importButton.waitFor({ timeout: 10000 });
    console.log("IMPORT_BUTTON_FOUND");
    await importButton.click();

    await page.getByText("Import Students", { exact: true }).waitFor({ timeout: 10000 });
    console.log("MODAL_OPENED");
    await page.screenshot({ path: `${OUT_DIR}\\import-modal.png` });

    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 10000 }),
      page.getByRole("button", { name: "Download CSV Template" }).click(),
    ]);
    console.log("TEMPLATE_DOWNLOADED", download.suggestedFilename());
    const templatePath = `${OUT_DIR}\\template-downloaded.csv`;
    await download.saveAs(templatePath);

    await page.getByRole("button", { name: "Choose CSV File" }).waitFor({ timeout: 5000 });
    console.log("FILE_INPUT_BUTTON_FOUND");

    console.log("CONSOLE_ERRORS", JSON.stringify(consoleErrors));
    console.log("RESULT: PASS");
  }
} catch (err) {
  console.log("CONSOLE_ERRORS", JSON.stringify(consoleErrors));
  console.error("RESULT: FAIL", err);
  await page.screenshot({ path: `${OUT_DIR}\\failure.png` }).catch(() => {});
  process.exitCode = 1;
} finally {
  await browser.close();
}
