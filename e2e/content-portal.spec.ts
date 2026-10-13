import "dotenv/config";

import { expect as baseExpect, test, type Page } from "@playwright/test";

import { field, publicStatus, runContentDbCli, signInToContent } from "./content-helpers";

// The Content Portal, driven through the browser as a Content Owner and then as a Content Editor.
// It runs against a real server and database (there is no mock backend), so it is one serial flow.
//
// What it leaves behind: nothing. Everything it creates carries a tag unique to the run, and the
// teardown removes only rows carrying that tag (e2e/fixtures/content-db-cli.ts). It never edits
// or publishes existing content, never saves Website Settings, and never sends the contact form
// for real, so no email reaches the studio.
//
// It needs a Content Owner to sign in as: CONTENT_OWNER_EMAIL and CONTENT_OWNER_PASSWORD.

// A development server builds each screen the first time it is opened, which can take longer than
// the default wait, so this suite waits more patiently for what it expects to appear.
const expect = baseExpect.configure({ timeout: 45_000 });

const OWNER_EMAIL = process.env.CONTENT_OWNER_EMAIL ?? "";
const OWNER_PASSWORD = process.env.CONTENT_OWNER_PASSWORD ?? "";

const TAG = `E2E-${Date.now().toString(36)}`;
// A year far in the future, so the test edition can never collide with a real one.
const FESTIVAL_YEAR = String(9000 + Math.floor(Math.random() * 1000));
const FESTIVAL_LABEL = `${TAG} edition`;
const ARTIST_NAME = `${TAG} Artist`;
const PERFORMANCE_TITLE = `${TAG} Showcase`;
const PERFORMANCE_SLUG = `${TAG.toLowerCase()}-showcase`;
const PRESS_TITLE = `${TAG} Feature Article`;
const MEDIA_TITLE = `${TAG} Video Link`;
const PROFILE_NAME = `${TAG} Instructor`;
const EDITOR_NAME = `${TAG} Editor`;
const EDITOR_EMAIL = `${TAG.toLowerCase()}@e2e.example.test`;
const EDITOR_PASSWORD = `Editor-${TAG}-pass`;
const INQUIRY_NAME = `${TAG} Visitor`;

test.describe.configure({ mode: "serial" });
test.skip(!OWNER_EMAIL || !OWNER_PASSWORD, "Set CONTENT_OWNER_EMAIL and CONTENT_OWNER_PASSWORD to run the Content Portal suite.");

let page: Page;
let festivalEditUrl = "";

const status = (label: string) => page.locator('[data-slot="badge"]', { hasText: new RegExp(`^${label}$`) }).first();
const heading = () => page.locator("h1").first();
// Error messages are <p role="alert">; Next.js adds its own empty alert element for screen readers,
// which is not an error, so alerts are matched by that shape rather than by role alone.

test.beforeAll(async ({ browser }) => {
  page = await browser.newPage();
  await signInToContent(page, OWNER_EMAIL, OWNER_PASSWORD);
  await expect(page).toHaveURL(/\/content$/);
});

test.afterAll(async () => {
  await page?.close();
  if (OWNER_EMAIL && OWNER_PASSWORD) runContentDbCli("cleanup", { tag: TAG });
});

test.describe("signed in as a Content Owner", () => {
  test("the overview greets the owner and the frame matches Studio Admin", async () => {
    await expect(heading()).toHaveText("Website content");
    await expect(page.getByText("Content Owner", { exact: true }).first()).toBeVisible();

    const sidebar = page.locator('[data-slot="sidebar"]').first();
    for (const label of ["Overview", "Festivals", "Performances", "Press & Media", "Public Profiles", "Media Library", "Inquiries", "Website Settings", "Users", "History"]) {
      await expect(sidebar.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
    await expect(page.getByRole("button", { name: /new inquir/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  for (const [path, title] of [
    ["/content/festivals", "Festivals"],
    ["/content/performances", "Performances"],
    ["/content/press", "Press & Media"],
    ["/content/profiles", "Public Profiles"],
    ["/content/media", "Media Library"],
    ["/content/inquiries", "Inquiries"],
    ["/content/settings", "Website Settings"],
    ["/content/users", "Content Users"],
    ["/content/history", "History"],
  ] as const) {
    test(`${path} opens`, async () => {
      await page.goto(path);

      await expect(heading()).toHaveText(title);
      await expect(page.locator('p[role="alert"]')).toHaveCount(0);
    });
  }

  test("a festival edition starts as a draft that visitors cannot reach", async () => {
    await page.goto("/content/festivals/new");
    await field(page, "year").fill(FESTIVAL_YEAR);
    await field(page, "label").fill(FESTIVAL_LABEL);
    await field(page, "eventDate").fill(`${FESTIVAL_YEAR}-10-25`);
    await field(page, "startTime").fill("15:00");
    await field(page, "summary").fill("An automated test edition.");
    await field(page, "venueName").fill("Test Auditorium");
    await field(page, "venueTown").fill("Sycamore");
    await page.getByRole("button", { name: "Add an artist" }).click();
    await field(page, "artists.0.name").fill(ARTIST_NAME);
    await field(page, "artists.0.artForm").fill("Kuchipudi");
    await page.getByRole("button", { name: "Save draft" }).click();

    await expect(page).toHaveURL(/\/content\/festivals\/(?!new)[^/]+$/);
    festivalEditUrl = page.url();
    await expect(heading()).toHaveText(`Ananta ${FESTIVAL_YEAR}`);
    await expect(status("Draft")).toBeVisible();
    expect(await publicStatus(page, `/ananta/${FESTIVAL_YEAR}`)).toBe(404);
  });

  test("the form refuses a second edition for the same year", async () => {
    await page.goto("/content/festivals/new");
    await field(page, "year").fill(FESTIVAL_YEAR);
    await field(page, "label").fill(`${FESTIVAL_LABEL} duplicate`);
    await field(page, "eventDate").fill(`${FESTIVAL_YEAR}-10-26`);
    await field(page, "startTime").fill("16:00");
    await field(page, "summary").fill("Should not be saved.");
    await field(page, "venueName").fill("Test Auditorium");
    await field(page, "venueTown").fill("Sycamore");
    await page.getByRole("button", { name: "Save draft" }).click();

    await expect(page.locator('p[role="alert"]')).toBeVisible();
    await expect(page).toHaveURL(/\/content\/festivals\/new$/);
  });

  test("the preview shows the draft as its public page would look", async () => {
    await page.goto(festivalEditUrl);
    await page.getByRole("link", { name: "Preview" }).click();

    await expect(page).toHaveURL(/\/preview$/);
    await expect(page.getByText("Preview only. Visitors cannot see this until it is published.")).toBeVisible();
    await expect(page.getByText(ARTIST_NAME)).toBeVisible();
    await expect(page.getByText("Test Auditorium, Sycamore, Illinois")).toBeVisible();
    await page.getByRole("link", { name: "Back to editing" }).click();
    await expect(page).toHaveURL(festivalEditUrl);
  });

  test("publishing puts the edition on the website and in the page list", async () => {
    await page.goto(festivalEditUrl);
    await page.getByRole("button", { name: "Publish", exact: true }).click();

    await expect(status("Published")).toBeVisible();
    await expect(page.getByText(/Last published .+ by /)).toBeVisible();
    const publicPage = await page.request.get(`/ananta/${FESTIVAL_YEAR}`);
    expect(publicPage.status()).toBe(200);
    expect(await publicPage.text()).toContain(ARTIST_NAME);
    expect(await (await page.request.get("/sitemap.xml")).text()).toContain(`/ananta/${FESTIVAL_YEAR}</loc>`);
  });

  test("revising a published edition returns it to draft and takes it off the website", async () => {
    await page.goto(festivalEditUrl);
    await expect(page.getByText(/Saving a change returns it to draft/)).toBeVisible();
    await field(page, "summary").fill("An automated test edition, revised.");
    await page.getByRole("button", { name: "Save and return to draft" }).click();

    await expect(status("Draft")).toBeVisible();
    expect(await publicStatus(page, `/ananta/${FESTIVAL_YEAR}`)).toBe(404);
    expect(await (await page.request.get("/sitemap.xml")).text()).not.toContain(`/ananta/${FESTIVAL_YEAR}</loc>`);
  });

  test("an archived edition stays in the portal, off the website, and can only be restored as a draft", async () => {
    await page.goto(festivalEditUrl);
    await page.getByRole("button", { name: "Archive" }).click();

    await expect(status("Archived")).toBeVisible();
    await expect(page.getByRole("button", { name: "Restore as draft" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Publish", exact: true })).toHaveCount(0);
    expect(await publicStatus(page, `/ananta/${FESTIVAL_YEAR}`)).toBe(404);

    await page.goto("/content/festivals");
    await expect(page.getByRole("row", { name: new RegExp(`Ananta ${FESTIVAL_YEAR}`) })).toContainText("Archived");
  });

  test("a performance gets its own page when published and loses it when archived", async () => {
    await page.goto("/content/performances/new");
    await field(page, "title").fill(PERFORMANCE_TITLE);
    await field(page, "summary").fill("An automated test performance.");
    await field(page, "description").fill("First paragraph.\n\nSecond paragraph.");
    await page.getByRole("button", { name: "Save draft" }).click();

    await expect(heading()).toHaveText(PERFORMANCE_TITLE);
    await expect(field(page, "slug")).toHaveValue(PERFORMANCE_SLUG);
    expect(await publicStatus(page, `/performances/${PERFORMANCE_SLUG}`)).toBe(404);

    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(status("Published")).toBeVisible();
    const publicPage = await page.request.get(`/performances/${PERFORMANCE_SLUG}`);
    expect(publicPage.status()).toBe(200);
    expect(await publicPage.text()).toContain("Second paragraph.");

    await page.getByRole("button", { name: "Archive" }).click();
    await expect(status("Archived")).toBeVisible();
    expect(await publicStatus(page, `/performances/${PERFORMANCE_SLUG}`)).toBe(404);
  });

  test("a press item needs something for visitors to open, then appears on the Press page once published", async () => {
    await page.goto("/content/press/new");
    await field(page, "title").fill(PRESS_TITLE);
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(page.locator('p[role="alert"]')).toContainText(/link|document/i);

    await field(page, "externalUrl").fill("https://example.com/e2e-article");
    await page.getByRole("button", { name: "Save draft" }).click();
    await expect(heading()).toHaveText(PRESS_TITLE);
    expect(await (await page.request.get("/press")).text()).not.toContain(PRESS_TITLE);

    await page.getByRole("button", { name: "Publish", exact: true }).click();
    await expect(status("Published")).toBeVisible();
    expect(await (await page.request.get("/press")).text()).toContain(PRESS_TITLE);

    await page.getByRole("button", { name: "Archive" }).click();
    await expect(status("Archived")).toBeVisible();
    expect(await (await page.request.get("/press")).text()).not.toContain(PRESS_TITLE);
  });

  test("a link added to the Media Library can be renamed and, while unused, deleted", async () => {
    await page.goto("/content/media");
    await page.getByRole("button", { name: "Add Link" }).click();
    const addLink = page.getByRole("dialog");
    await field(addLink, "title").fill(MEDIA_TITLE);
    await field(addLink, "url").fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await addLink.getByRole("button", { name: "Add", exact: true }).click();
    await expect(addLink).toBeHidden();

    const card = page.getByRole("listitem").filter({ hasText: MEDIA_TITLE });
    await expect(card).toContainText("Video");
    await expect(card).toContainText("Not used yet");

    await card.getByRole("button", { name: "Details" }).click();
    const details = page.getByRole("dialog");
    await field(details, "title").fill(`${MEDIA_TITLE} renamed`);
    await details.getByRole("button", { name: "Save" }).click();
    await expect(details).toBeHidden();
    const renamed = page.getByRole("listitem").filter({ hasText: `${MEDIA_TITLE} renamed` });
    await expect(renamed).toBeVisible();

    await renamed.getByRole("button", { name: "Delete" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: MEDIA_TITLE })).toHaveCount(0);
  });

  test("the upload window explains what it accepts and refuses to upload nothing", async () => {
    await page.goto("/content/media");
    await page.getByRole("button", { name: "Upload File" }).click();
    const upload = page.getByRole("dialog");

    await expect(upload).toContainText("up to 10 MB");
    await expect(upload).toContainText("up to 100 MB");
    await upload.getByRole("button", { name: "Upload", exact: true }).click();
    await expect(upload.locator('p[role="alert"]')).toHaveText("Choose a file to upload.");
    await upload.getByRole("button", { name: "Cancel" }).click();
  });

  test("a profile is hidden until its website switch is on", async () => {
    await page.goto("/content/profiles/new");
    await field(page, "name").fill(PROFILE_NAME);
    await field(page, "title").fill("Guest Instructor");
    await field(page, "summary").fill("An automated test profile.");
    await field(page, "biography").fill("Biography paragraph one.\n\nBiography paragraph two.");
    await page.getByRole("button", { name: "Save profile" }).click();

    await expect(heading()).toHaveText(PROFILE_NAME);
    await expect(status("Hidden")).toBeVisible();
    expect(await (await page.request.get("/instructors")).text()).not.toContain(PROFILE_NAME);

    await page.getByRole("switch").click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(status("On the website")).toBeVisible();
    expect(await (await page.request.get("/instructors")).text()).toContain(PROFILE_NAME);

    await page.getByRole("switch").click();
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(status("Hidden")).toBeVisible();
    expect(await (await page.request.get("/instructors")).text()).not.toContain(PROFILE_NAME);
  });

  test("Website Settings shows the saved site details and the site's image places", async () => {
    await page.goto("/content/settings");

    await expect(field(page, "contactEmail")).toHaveValue(/.+@.+/);
    await expect(field(page, "contactPhone")).not.toHaveValue("");
    await expect(field(page, "homeIntro")).not.toHaveValue("");
    await expect(page.getByRole("button", { name: "Save settings" })).toBeEnabled();
    await expect(page.getByText("Site images and video")).toBeVisible();
    for (const place of ["Home page opening video", "Founders photo (home and About pages)", "Training: Bharatanatyam"]) {
      await expect(page.getByText(place)).toBeVisible();
    }
  });

  test("a new inquiry shows on the bell, is marked read when opened, and can be replied to and archived", async () => {
    runContentDbCli("seed-inquiry", { tag: TAG });
    await page.goto("/content/inquiries");

    const bell = page.getByRole("button", { name: /new inquir/i });
    await expect(bell).toHaveAccessibleName(/^[1-9]\d* new inquir(y|ies)$/);
    const nameBefore = (await bell.locator(".sr-only").innerText()).trim();

    const row = page.getByRole("row", { name: new RegExp(INQUIRY_NAME) });
    await expect(row).toContainText("New");
    await row.click();

    const inquiry = page.getByRole("dialog");
    await expect(inquiry).toContainText(`Inquiry from ${INQUIRY_NAME}`);
    await expect(inquiry).toContainText("Is there a beginner class?");
    await expect(inquiry.getByRole("link", { name: EDITOR_EMAIL })).toHaveAttribute("href", `mailto:${EDITOR_EMAIL}`);
    await expect(inquiry.getByRole("link", { name: "Reply by email" })).toHaveAttribute("href", /^mailto:.+subject=/);
    await expect(inquiry.locator('[data-slot="badge"]').first()).toHaveText("Read");

    await inquiry.getByRole("button", { name: "Mark as replied" }).click();
    await expect(inquiry.locator('[data-slot="badge"]').first()).toHaveText("Replied");
    await inquiry.getByRole("button", { name: "Archive" }).click();
    await expect(inquiry.locator('[data-slot="badge"]').first()).toHaveText("Archived");
    await inquiry.getByRole("button", { name: "Close" }).click();
    await expect(inquiry).toBeHidden();

    // Opening it marked it read, so the bell's count has gone down.
    await expect(bell).not.toHaveAccessibleName(nameBefore);
    await expect(page.getByRole("row", { name: new RegExp(INQUIRY_NAME) })).toHaveCount(0);
    await page.getByRole("combobox").filter({ hasText: "All except archived" }).click();
    await page.getByRole("option", { name: "Archived", exact: true }).click();
    await expect(page.getByRole("row", { name: new RegExp(INQUIRY_NAME) })).toContainText("Archived");
  });

  test("the inquiries list can be searched", async () => {
    await page.goto("/content/inquiries");
    await page.getByPlaceholder(/Search by name/).fill("no-inquiry-should-match-this-text");

    await expect(page.getByText("No inquiries match.")).toBeVisible();
  });

  test("the owner can add a Content Editor", async () => {
    await page.goto("/content/users");
    await page.getByRole("button", { name: "Add User" }).click();
    const addUser = page.getByRole("dialog");
    await field(addUser, "name").fill(EDITOR_NAME);
    await field(addUser, "email").fill(EDITOR_EMAIL);
    await field(addUser, "password").fill("short");
    await addUser.getByRole("button", { name: "Add user" }).click();
    await expect(addUser.getByText("Use at least 10 characters")).toBeVisible();

    await field(addUser, "password").fill(EDITOR_PASSWORD);
    await addUser.getByRole("button", { name: "Add user" }).click();
    await expect(addUser).toBeHidden();

    const row = page.getByRole("row", { name: new RegExp(EDITOR_NAME) });
    await expect(row).toContainText("Content Editor");
    await expect(row).toContainText("Active");
  });

  test("the history records what was done, and by whom", async () => {
    await page.goto("/content/history");

    await expect(page.getByText(`Created the ${FESTIVAL_YEAR} festival as a draft.`)).toBeVisible();
    await expect(page.getByText(`Published the ${FESTIVAL_YEAR} festival.`)).toBeVisible();
    await expect(page.getByText(new RegExp(`Added ${EDITOR_NAME} as a Content Editor`))).toBeVisible();
  });

  test("the public website shows the owner an account menu leading back to the portal", async () => {
    await page.goto("/about");
    await page.getByRole("button", { name: "Open account menu" }).click();

    await expect(page.getByRole("menu")).toContainText("Content Portal");
    await expect(page.getByRole("menuitem", { name: "Open dashboard" })).toHaveAttribute("href", "/content");
    await page.keyboard.press("Escape");
  });
});

test.describe("signed in as a Content Editor", () => {
  let editorPage: Page;

  test.beforeAll(async ({ browser }) => {
    // A separate browser session, so the owner stays signed in on the other page.
    editorPage = await (await browser.newContext()).newPage();
    await signInToContent(editorPage, EDITOR_EMAIL, EDITOR_PASSWORD);
    await expect(editorPage).toHaveURL(/\/content$/);
  });

  test.afterAll(async () => {
    await editorPage?.context().close();
  });

  test("the editor sees the content sections but not the owner's", async () => {
    await expect(editorPage.getByText("Content Editor", { exact: true }).first()).toBeVisible();

    const sidebar = editorPage.locator('[data-slot="sidebar"]').first();
    for (const label of ["Festivals", "Performances", "Press & Media", "Media Library", "Inquiries"]) {
      await expect(sidebar.getByRole("link", { name: label, exact: true })).toBeVisible();
    }
    for (const label of ["Website Settings", "Users", "History"]) {
      await expect(sidebar.getByRole("link", { name: label, exact: true })).toHaveCount(0);
    }
  });

  test("typing an owner-only address does not get the editor in", async () => {
    await editorPage.goto("/content/users");
    await expect(editorPage.getByText("Only a Content Owner can manage content users.")).toBeVisible();
    await expect(editorPage.getByRole("button", { name: "Add User" })).toHaveCount(0);

    await editorPage.goto("/content/history");
    await expect(editorPage.getByText("Only a Content Owner can see the content history.")).toBeVisible();

    await editorPage.goto("/content/settings");
    await expect(editorPage.getByText("Only a Content Owner can change the website settings.")).toBeVisible();
    await expect(editorPage.getByRole("button", { name: "Save settings" })).toBeDisabled();
  });

  test("the editor can write a draft but is given no way to publish it", async () => {
    await editorPage.goto("/content/press/new");
    await field(editorPage, "title").fill(`${PRESS_TITLE} by editor`);
    await field(editorPage, "externalUrl").fill("https://example.com/e2e-editor-article");
    await editorPage.getByRole("button", { name: "Save draft" }).click();

    await expect(editorPage.locator("h1").first()).toHaveText(`${PRESS_TITLE} by editor`);
    await expect(editorPage.getByRole("button", { name: "Publish", exact: true })).toHaveCount(0);
    await expect(editorPage.getByRole("button", { name: "Archive" })).toHaveCount(0);
    await expect(editorPage.getByRole("button", { name: "Save changes" })).toBeEnabled();
  });

  test("the editor can read content that is not a draft but cannot change it", async () => {
    await editorPage.goto(festivalEditUrl);

    await expect(editorPage.getByText(/only a Content Owner can change it/)).toBeVisible();
    await expect(editorPage.getByRole("button", { name: "Save changes" })).toBeDisabled();
    await expect(field(editorPage, "summary")).toBeDisabled();
    await expect(editorPage.getByRole("button", { name: "Restore as draft" })).toHaveCount(0);
  });

  test("the editor can read and handle inquiries", async () => {
    await editorPage.goto("/content/inquiries");

    await expect(editorPage.locator("h1").first()).toHaveText("Inquiries");
    await expect(editorPage.getByRole("button", { name: /new inquir/i })).toBeVisible();
  });

  test("once the owner turns off the editor's sign-in, the editor is out at once and cannot return", async () => {
    await page.goto("/content/users");
    await page.getByRole("row", { name: new RegExp(EDITOR_NAME) }).getByRole("button", { name: "Edit" }).click();
    const editUser = page.getByRole("dialog");
    await editUser.getByRole("switch").click();
    await editUser.getByRole("button", { name: "Save" }).click();
    await expect(editUser).toBeHidden();
    await expect(page.getByRole("row", { name: new RegExp(EDITOR_NAME) })).toContainText("Deactivated");

    // The editor still holds a session cookie; the account is rechecked on every request.
    await editorPage.goto("/content/festivals");
    await expect(editorPage).toHaveURL(/\/content\/login$/);

    await signInToContent(editorPage, EDITOR_EMAIL, EDITOR_PASSWORD);
    await expect(editorPage.getByText("Invalid email or password.")).toBeVisible();
  });
});

test.describe("signing out", () => {
  test("signing out ends the session", async () => {
    await page.goto("/content");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/content\/login$/);

    await page.goto("/content/festivals");
    await expect(page).toHaveURL(/\/content\/login$/);
    expect(await publicStatus(page, "/content")).toBe(307);
  });
});
