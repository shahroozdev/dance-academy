import { describe, expect, it } from "vitest";

import { BUILT_IN_FESTIVALS, BUILT_IN_PROFILES, DEFAULT_SITE_SETTINGS, NAV_LINKS, SITE_NAME } from "@/lib/public-site";
import {
  breadcrumbJsonLd,
  festivalJsonLd,
  instructorsJsonLd,
  organizationJsonLd,
  pageMetadata,
  websiteJsonLd,
} from "@/lib/seo";
import { SITE_URL, absoluteUrl } from "@/lib/site-url";

describe("page metadata", () => {
  const metadata = pageMetadata({ title: "Dance Training", description: "About the training.", path: "/training" });

  it("gives every page a canonical address and matching link-preview fields", () => {
    expect(metadata.title).toBe("Dance Training");
    expect(metadata.alternates?.canonical).toBe("/training");
    expect(metadata.openGraph).toMatchObject({
      url: "/training",
      siteName: SITE_NAME,
      title: `Dance Training | ${SITE_NAME}`,
      description: "About the training.",
    });
  });

  it("always names the share image, since a page does not inherit one from its parent", () => {
    expect(metadata.openGraph?.images).toEqual([expect.objectContaining({ url: "/opengraph-image", width: 1200, height: 630 })]);
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("does not append the site name to a title that already contains it", () => {
    const home = pageMetadata({ title: `${SITE_NAME} — Home`, description: "x", path: "/", absoluteTitle: true });

    expect(home.title).toEqual({ absolute: `${SITE_NAME} — Home` });
    expect(home.openGraph?.title).toBe(`${SITE_NAME} — Home`);
  });
});

describe("site address", () => {
  it("builds absolute addresses without a trailing slash on the home page", () => {
    expect(SITE_URL.endsWith("/")).toBe(false);
    expect(absoluteUrl("/")).toBe(SITE_URL);
    expect(absoluteUrl("/about")).toBe(`${SITE_URL}/about`);
  });
});

describe("structured data", () => {
  it("names the site and the organization the way Google reads them from the home page", () => {
    expect(websiteJsonLd()).toMatchObject({ "@type": "WebSite", name: SITE_NAME, url: SITE_URL });
    expect(organizationJsonLd()).toMatchObject({ name: SITE_NAME, url: SITE_URL, logo: expect.stringContaining(SITE_URL) });
  });

  it("never publishes a street address for the studio", () => {
    const addresses = organizationJsonLd().address as Record<string, unknown>[];

    expect(addresses).toHaveLength(2);
    for (const address of addresses) expect(address).not.toHaveProperty("streetAddress");
  });

  it("starts every breadcrumb trail at Home and has the two steps Google requires", () => {
    const trail = breadcrumbJsonLd([{ name: "Training", path: "/training" }]).itemListElement as Record<string, unknown>[];

    expect(trail).toEqual([
      expect.objectContaining({ position: 1, name: "Home", item: SITE_URL }),
      expect.objectContaining({ position: 2, name: "Training", item: `${SITE_URL}/training` }),
    ]);
  });

  it("describes each festival edition with the date, place and artists an event listing needs", () => {
    for (const edition of BUILT_IN_FESTIVALS) {
      const event = festivalJsonLd(edition);

      // An ISO date-time with a UTC offset, as Google asks for.
      expect(event.startDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
      expect(String(event.startDate).startsWith(edition.year)).toBe(true);
      expect(event.location).toMatchObject({ name: edition.venueName, address: { addressLocality: edition.venueTown } });
      expect(event.performer).toHaveLength(edition.artists.length);
      expect(event.url).toBe(`${SITE_URL}/ananta/${edition.year}`);
    }
  });

  it("links each instructor's portrait by its full address", () => {
    for (const person of instructorsJsonLd(BUILT_IN_PROFILES)) expect(person.image).toMatch(/^https:\/\/res\.cloudinary\.com\//);
  });

  it("uses the contact details and founders managed in the Content Portal when they are given", () => {
    const organization = organizationJsonLd(
      { ...DEFAULT_SITE_SETTINGS, email: "hello@example.com", socialLinks: [] },
      [{ name: "New Founder" }],
    );

    expect(organization).toMatchObject({ email: "hello@example.com", sameAs: [], founder: [{ name: "New Founder" }] });
  });

  it("adds the venue's street address and ZIP code to an event once they are entered", () => {
    const [edition] = BUILT_IN_FESTIVALS;
    const withAddress = festivalJsonLd({ ...edition, venueStreet: "427 Spartan Trail", venuePostalCode: "60178" });

    expect(festivalJsonLd(edition).location).not.toHaveProperty("address.streetAddress");
    expect(withAddress.location).toMatchObject({ address: { streetAddress: "427 Spartan Trail", postalCode: "60178" } });
  });

  it("keeps a portal-managed image address as it is instead of prefixing the site address", () => {
    const [profile] = BUILT_IN_PROFILES;
    const [person] = instructorsJsonLd([{ ...profile, photo: { src: "https://files.example.com/a.jpg", alt: "A" } }]);

    expect(person.image).toBe("https://files.example.com/a.jpg");
  });
});

describe("menu", () => {
  it("has a unique address for every page", () => {
    const paths = NAV_LINKS.map((link) => link.href);

    expect(new Set(paths).size).toBe(paths.length);
  });
});
