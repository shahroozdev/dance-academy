import "dotenv/config";

import { expect as baseExpect, test, type Page } from "@playwright/test";

import { field, runContentDbCli, signInToContent } from "./content-helpers";

// The Careers module end to end: a Content Owner adds and publishes a job opening, a visitor finds
// it on the website and opens the application form, an application is read in the portal, and
// both are deleted again through the portal.
//
// What it leaves behind: nothing. Everything carries a tag unique to the run, and the teardown
// removes only tagged rows and their private resume files (e2e/fixtures/content-db-cli.ts). The
// application is put in the database directly instead of being sent through the public form,
// because the real form emails the studio.

const expect = baseExpect.configure({ timeout: 45_000 });

const OWNER_EMAIL = process.env.CONTENT_OWNER_EMAIL ?? "";
const OWNER_PASSWORD = process.env.CONTENT_OWNER_PASSWORD ?? "";

const TAG = `E2E-${Date.now().toString(36)}`;
const JOB_TITLE = `${TAG} Dance Instructor`;
const APPLICANT = `${TAG} Applicant`;

test.describe.configure({ mode: "serial" });
test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, "Set CONTENT_OWNER_EMAIL and CONTENT_OWNER_PASSWORD to run the Careers suite.");

let page: Page;
let jobId = "";
let resumePublicId = "";

const heading = () => page.locator("h1").first();
const status = (label: string) => page.locator('[data-slot="badge"]', { hasText: new RegExp(`^${label}$`) }).first();
const publicHtml = async (path: string) => (await page.request.get(path)).text();

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  await signInToContent(page, OWNER_EMAIL, OWNER_PASSWORD);
  await expect(page).toHaveURL(/\/content$/);
});

test.afterAll(async () => {
  await page?.close();
  if (OWNER_EMAIL && OWNER_PASSWORD) console.warn("Cleanup:", runContentDbCli("cleanup", { tag: TAG }));
});

test("an owner adds a job opening as a draft, and it reaches the website only once published", async () => {
  await page.goto("/content/jobs/new");
  await field(page, "title").fill(JOB_TITLE);
  await field(page, "location").fill("Wood Dale");
  await field(page, "employmentType").fill("Part-time");
  await field(page, "description").fill(`Automated test opening ${TAG}.\n\nTeach weekly classes.`);
  await page.getByRole("button", { name: "Save draft" }).click();

  await expect(page).toHaveURL(/\/content\/jobs\/(?!new)[^/]+$/);
  jobId = page.url().split("/").pop() ?? "";
  await expect(heading()).toHaveText(JOB_TITLE);
  await expect(status("Draft")).toBeVisible();
  expect(await publicHtml("/careers")).not.toContain(JOB_TITLE);

  await page.getByRole("button", { name: "Publish" }).click();
  await expect(status("Published")).toBeVisible();
  await expect.poll(() => publicHtml("/careers")).toContain(JOB_TITLE);
  const home = await publicHtml("/");
  expect(home).toContain("Join our Team");
  expect(home).toContain(JOB_TITLE);
});

test("a visitor's Apply button opens the job form with that position chosen, and the form checks its answers", async ({ browser }) => {
  const visitor = await browser.newPage();
  await visitor.goto("/careers");
  await visitor.locator("li", { hasText: JOB_TITLE }).getByRole("link", { name: "Apply" }).click();

  await expect(visitor).toHaveURL(new RegExp(`/careers\\?position=${jobId}#apply$`));
  await expect(field(visitor, "jobOpeningId")).toContainText(JOB_TITLE);
  await expect(visitor.locator("#apply")).not.toContainText("Student");

  await visitor.getByRole("button", { name: "Send Application" }).click();
  await expect(visitor.getByText("Your name is required")).toBeVisible();
  await expect(visitor.getByText("Please tell us about your experience")).toBeVisible();

  await visitor.locator("#resume").setInputFiles({ name: "cv.txt", mimeType: "text/plain", buffer: Buffer.from("not a pdf") });
  await expect(visitor.getByText("Please attach your resume as a PDF file.")).toBeVisible();

  await visitor.goto("/contact");
  await expect(visitor.locator("main")).toBeVisible();
  expect(await visitor.content()).not.toContain("Job Application");
  await visitor.close();
});

test("an application is listed under Job Applications, not Inquiries, and its resume opens privately", async () => {
  ({ resumePublicId } = runContentDbCli<{ id: string; resumePublicId: string }>("seed-application", { tag: TAG, jobId }));

  await page.goto("/content/inquiries");
  await page.getByPlaceholder(/Search by name/).fill(TAG);
  await expect(page.getByText(/No inquiries match/)).toBeVisible();

  await page.goto("/content/applications");
  await page.getByPlaceholder(/Search by name/).fill(TAG);
  const row = page.getByRole("row", { name: new RegExp(APPLICANT) });
  await expect(row).toContainText(JOB_TITLE);

  // The position filter: this opening shows it, "General applications" does not.
  const positionFilter = page.getByRole("combobox").first();
  await positionFilter.click();
  await page.getByRole("option", { name: "General applications", exact: true }).click();
  await expect(page.getByText(/No applications match/)).toBeVisible();
  await positionFilter.click();
  await page.getByRole("option", { name: JOB_TITLE, exact: true }).click();
  await expect(row).toBeVisible();

  await row.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText(`Application from ${APPLICANT}`);
  await expect(dialog).toContainText(JOB_TITLE);
  await expect(dialog).toContainText("Eight years of Bharatanatyam.");
  await expect(dialog).toContainText("Weekday evenings");

  // Opening the resume asks the server for a short-lived signed link; that link returns the PDF.
  const linkRequest = page.context().waitForEvent("request", (request) => request.url().includes("/raw/download"));
  await dialog.getByRole("button", { name: "Open resume" }).click();
  const signedLink = (await linkRequest).url();
  const resume = await page.request.get(signedLink);
  expect(resume.status()).toBe(200);
  expect((await resume.body()).subarray(0, 5).toString()).toBe("%PDF-");
  await Promise.all(page.context().pages().filter((tab) => tab !== page).map((tab) => tab.close()));

  // The file stays stored for as long as its application exists.
  expect(runContentDbCli<{ exists: boolean }>("resume-exists", { tag: TAG, publicId: resumePublicId }).exists).toBe(true);
  await expect(dialog.locator('[data-slot="badge"]').first()).toHaveText("Read");
});

test("an owner deletes the application, which also removes its resume", async () => {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Delete" }).click();
  await expect(dialog).toContainText("Delete this application and its resume for good?");
  await dialog.getByRole("button", { name: "Delete" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText(/No applications match/)).toBeVisible();
  expect(runContentDbCli<{ exists: boolean }>("resume-exists", { tag: TAG, publicId: resumePublicId }).exists).toBe(false);
});

test("an owner deletes the job opening, which takes it off the website", async () => {
  await page.goto(`/content/jobs/${jobId}`);
  await expect(heading()).toHaveText(JOB_TITLE);
  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();

  await expect(page).toHaveURL(/\/content\/jobs$/);
  await expect.poll(() => publicHtml("/careers")).not.toContain(JOB_TITLE);
  expect(await publicHtml("/")).not.toContain(JOB_TITLE);
});
