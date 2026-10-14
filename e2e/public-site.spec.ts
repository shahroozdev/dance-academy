import { expect, test, type Page } from "@playwright/test";

import { field } from "./content-helpers";

// The public website, as a visitor with no account sees it. Everything here only reads — no test
// saves anything or sends an email — so it is safe to run against any environment.
//
// The contact form is the one place a visitor can write. Its validation is tested for real; its
// success screen is reached through the form's hidden anti-spam field, which the server answers
// with "sent" while saving nothing and emailing no one.

const PAGES = [
  { path: "/", title: /Malhaar Dance Company/, heading: /Rooted in/i },
  { path: "/about", title: /About Us/, heading: /A shared/i },
  { path: "/training", title: /Dance Training/, heading: /More than/i },
  { path: "/instructors", title: /Instructors/, heading: /Meet the/i },
  { path: "/performances", title: /Performances/, heading: /From training/i },
  { path: "/press", title: /Press & Media/, heading: /in the Press/i },
  { path: "/support", title: /Support/, heading: /./ },
  { path: "/contact", title: /Contact/, heading: /Get in/i },
] as const;

const MENU_LINKS = ["Home", "About", "Training", "Instructors", "Performances", "Ananta Festival", "Press & Media", "Support", "Contact"];

/** Records every image or video request that fails while a page is used. */
function trackBrokenMedia(page: Page) {
  const broken: string[] = [];
  page.on("response", (response) => {
    const type = response.request().resourceType();
    if ((type === "image" || type === "media") && response.status() >= 400) broken.push(`${response.status()} ${response.url()}`);
  });
  return broken;
}

test.describe("every public page", () => {
  for (const { path, title, heading } of PAGES) {
    test(`${path} loads with its title, one main heading, and no broken images`, async ({ page }) => {
      const broken = trackBrokenMedia(page);
      const response = await page.goto(path);

      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(title);
      await expect(page.locator("h1")).toHaveCount(1);
      await expect(page.locator("h1")).toContainText(heading);
      await expect(page.getByRole("link", { name: /Malhaar Dance Company — home/ })).toBeVisible();

      // Scroll through the page so lazily loaded pictures are requested too.
      await page.evaluate(async () => {
        const scroller = document.getElementById("public-scroll") ?? document.scrollingElement;
        if (!scroller) return;
        for (let y = 0; y < scroller.scrollHeight; y += 600) {
          scroller.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 60));
        }
      });
      await page.waitForLoadState("networkidle");
      expect(broken).toEqual([]);
    });

    test(`${path} fits a phone screen without sideways scrolling`, async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto(path);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test("an unknown address shows the not-found page", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist");

    expect(response?.status()).toBe(404);
    await expect(page.getByRole("link", { name: /home/i }).first()).toBeVisible();
  });
});

test.describe("navigation", () => {
  test("the menu lists every page and takes the visitor there", async ({ page }) => {
    await page.goto("/about");
    await page.getByRole("button", { name: "Open menu" }).click();

    const menu = page.getByRole("navigation", { name: "Main" });
    for (const label of MENU_LINKS) await expect(menu.getByRole("link", { name: label, exact: true })).toBeVisible();
    await expect(menu.getByRole("link", { name: "About", exact: true })).toHaveAttribute("aria-current", "page");

    await menu.getByRole("link", { name: "Training", exact: true }).click();
    await expect(page).toHaveURL(/\/training$/);
    await expect(page.locator("h1")).toContainText(/More than/i);
  });

  test("the menu offers registration, and the footer repeats the page links", async ({ page }) => {
    await page.goto("/contact");

    const footer = page.getByRole("navigation", { name: "Footer" });
    for (const label of MENU_LINKS) await expect(footer.getByRole("link", { name: label, exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByRole("dialog").getByRole("link", { name: "Register for Classes" })).toHaveAttribute("href", "/register");
  });

  test("the home page has a section for each page, each with a way in", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("[data-panel]")).toHaveCount(9);
    await expect(page.getByRole("link", { name: "Register for Classes" }).first()).toHaveAttribute("href", "/register");
    await expect(page.getByRole("link", { name: "View Performances" })).toHaveAttribute("href", "/performances");
    await expect(page.getByRole("link", { name: "Meet the Instructors" })).toHaveAttribute("href", "/instructors");
  });

  test("the home page opens with a video that has a still image behind it", async ({ page }) => {
    await page.goto("/");

    const video = page.locator('[data-panel="home"] video');
    await expect(video).toHaveAttribute("poster", /.+/);
    await expect(video.locator("source")).toHaveAttribute("src", /\.mp4/);
  });
});

test.describe("festival", () => {
  test("the festival link opens the newest edition, with its date, venue, artists, and tickets", async ({ page }) => {
    await page.goto("/ananta");

    await expect(page).toHaveURL(/\/ananta\/\d{4}$/);
    const year = page.url().split("/").pop() ?? "";
    await expect(page.locator("h1")).toContainText(year);
    await expect(page.getByRole("heading", { name: /Featured\s*Artists/i })).toBeVisible();
    await expect(page.locator("#artists li").first()).toBeVisible();
    await expect(page.getByRole("link", { name: `Ananta ${year}` })).toHaveAttribute("aria-current", "page");
    await expect(page.getByRole("link", { name: "Become a Sponsor" }).first()).toHaveAttribute("href", /\/contact\?interest=/);
  });

  test("a year with no festival is not found", async ({ page }) => {
    const response = await page.goto("/ananta/1999");

    expect(response?.status()).toBe(404);
  });
});

test.describe("performances and instructors", () => {
  test("the Performances page shows a photo gallery, each photo with a description", async ({ page }) => {
    await page.goto("/performances");

    const photos = page.getByRole("list", { name: "Performance photos" }).locator("img");
    expect(await photos.count()).toBeGreaterThanOrEqual(6);
    for (const alt of await photos.evaluateAll((images) => images.map((image) => image.getAttribute("alt")))) {
      expect(alt?.trim().length).toBeGreaterThan(5);
    }
    await expect(page.getByRole("link", { name: "Book a Performance" })).toHaveAttribute("href", /interest=Performance/);
  });

  test("a performance that does not exist is not found", async ({ page }) => {
    const response = await page.goto("/performances/no-such-performance");

    expect(response?.status()).toBe(404);
  });

  test("an instructor's card opens their full biography", async ({ page }) => {
    await page.goto("/instructors");

    const cards = page.getByRole("button", { name: /Read Biography/ });
    expect(await cards.count()).toBeGreaterThanOrEqual(1);
    const name = (await cards.first().locator("h2").innerText()).trim();

    await cards.first().click();
    const biography = page.getByRole("dialog");
    await expect(biography).toContainText(new RegExp(name, "i"));
    await expect(biography.locator("p").first()).toBeVisible();

    await biography.getByRole("button", { name: "Close" }).click();
    await expect(biography).toBeHidden();
  });
});

test.describe("contact form", () => {
  test("shows the studio's contact details", async ({ page }) => {
    await page.goto("/contact");

    await expect(page.getByRole("main").getByRole("link", { name: /@/ }).first()).toHaveAttribute("href", /^mailto:/);
    await expect(page.getByRole("main").locator('a[href^="tel:"]')).toBeVisible();
  });

  test("refuses an empty message and says what is missing", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("button", { name: "Send Inquiry" }).click();

    await expect(page.getByText("Your name is required")).toBeVisible();
    await expect(page.getByText("Enter a valid email")).toBeVisible();
    await expect(page.getByText("Please choose what you are interested in")).toBeVisible();
    await expect(page.getByText("Please write a short message")).toBeVisible();
    await expect(page.getByText("Thank you for reaching out.")).toBeHidden();
  });

  test("refuses an email address that is not one", async ({ page }) => {
    await page.goto("/contact");
    await field(page, "name").fill("Test Visitor");
    await field(page, "email").fill("not-an-email");
    await page.getByRole("button", { name: "Send Inquiry" }).click();

    await expect(page.getByText("Enter a valid email")).toBeVisible();
  });

  test("arrives with the subject already chosen when a button elsewhere asks for it", async ({ page }) => {
    await page.goto("/contact?interest=Sponsorship");

    await expect(field(page, "interestedIn")).toContainText("Sponsorship");
  });

  test("thanks the visitor once the form is accepted", async ({ page }) => {
    await page.goto("/contact?interest=Other");
    await field(page, "name").fill("Automated Test");
    await field(page, "email").fill("automated-test@e2e.example.test");
    await field(page, "message").fill("Automated check of the contact form's success screen.");
    // The hidden anti-spam field: a filled value makes the server answer "sent" without saving the
    // message or emailing the studio, so the success screen can be checked with no side effects.
    await page.locator('input[name="company"]').evaluate((input) => input.closest("div.hidden")?.classList.remove("hidden"));
    await page.locator('input[name="company"]').fill("automated-test");
    await page.getByRole("button", { name: "Send Inquiry" }).click();

    await expect(page.getByText("Thank you for reaching out.")).toBeVisible();
  });
});

test.describe("search engines", () => {
  test("the page list names the public pages and nothing private or unpublished", async ({ page }) => {
    const response = await page.request.get("/sitemap.xml");
    const xml = await response.text();

    expect(response.status()).toBe(200);
    for (const path of ["/about", "/training", "/instructors", "/performances", "/press", "/support", "/contact"]) {
      expect(xml).toContain(`${path}</loc>`);
    }
    expect(xml).toMatch(/\/ananta\/\d{4}<\/loc>/);
    expect(xml).not.toMatch(/\/(admin|content|register|api)\b/);
  });

  test("robots.txt points at the page list and keeps crawlers out of the app's endpoints", async ({ page }) => {
    const text = await (await page.request.get("/robots.txt")).text();

    expect(text).toMatch(/Sitemap: .+\/sitemap\.xml/);
    expect(text).toContain("Disallow: /api/");
  });

  test("each page names its own address as the one to index", async ({ page }) => {
    for (const path of ["/about", "/training", "/contact"]) {
      await page.goto(path);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`${path}$`));
      await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /.{50,}/);
    }
  });

  test("the home page describes the organization, and a festival page its event", async ({ page }) => {
    const structuredTypes = async () =>
      page.locator('script[type="application/ld+json"]').evaluateAll((scripts) =>
        scripts.flatMap((script) =>
          ((JSON.parse(script.textContent ?? "{}") as { "@graph"?: { "@type": string | string[] }[] })["@graph"] ?? []).flatMap(
            (node) => node["@type"],
          ),
        ),
      );

    await page.goto("/");
    expect(await structuredTypes()).toEqual(expect.arrayContaining(["WebSite", "DanceGroup"]));

    await page.goto("/ananta");
    expect(await structuredTypes()).toEqual(expect.arrayContaining(["BreadcrumbList", "DanceEvent"]));
  });

  test("the sign-in pages and the registration form ask not to be indexed", async ({ page }) => {
    for (const path of ["/admin/login", "/content/login", "/register"]) {
      await page.goto(path);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    }
  });
});

test.describe("what a visitor cannot reach", () => {
  for (const path of ["/content", "/content/festivals", "/content/inquiries", "/content/users", "/content/media"]) {
    test(`${path} sends a signed-out visitor to the content sign-in`, async ({ page }) => {
      await page.goto(path);

      await expect(page).toHaveURL(/\/content\/login$/);
      await expect(page.getByText("Sign in to manage the public website.")).toBeVisible();
    });
  }

  test("the studio admin sends a signed-out visitor to its own sign-in", async ({ page }) => {
    await page.goto("/admin");

    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("the content sign-in rejects a wrong password without saying which part was wrong", async ({ page }) => {
    await page.goto("/content/login");
    await field(page, "email").fill("nobody@e2e.example.test");
    await field(page, "password").fill("definitely-not-the-password");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText("Invalid email or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/content\/login$/);
  });
});
