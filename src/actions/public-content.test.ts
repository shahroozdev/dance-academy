import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findFestivals: vi.fn(),
  findPerformances: vi.fn(),
  findPressItems: vi.fn(),
  findProfiles: vi.fn(),
  findSettings: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    festival: { findMany: mocks.findFestivals },
    performance: { findMany: mocks.findPerformances },
    pressItem: { findMany: mocks.findPressItems },
    publicProfile: { findMany: mocks.findProfiles },
    websiteSettings: { findUnique: mocks.findSettings },
  },
}));

import {
  getPublicFestivals,
  getPublicPerformance,
  getPublicPerformances,
  getPublicPressItems,
  getPublicProfiles,
  getPublicSiteSettings,
} from "@/actions/public-content";
import { BUILT_IN_FESTIVALS, BUILT_IN_PROFILES, DEFAULT_SITE_SETTINGS } from "@/lib/public-site";

const tableMissing = new Error('The table "public.Festival" does not exist in the current database.');

const festivalRow = (year: string, status: string) => ({
  year,
  status,
  label: "Edition",
  eventDate: new Date(`${year}-10-25T00:00:00.000Z`),
  startTime: "15:00",
  venueName: "Auditorium",
  venueTown: "Sycamore",
  venueRegion: "IL",
  venueStreet: null,
  venuePostalCode: null,
  summary: "Summary",
  ticketUrl: null,
  artists: [],
  media: [],
});

const profileRow = (name: string, isVisible: boolean) => ({
  name,
  isVisible,
  title: "Instructor",
  summary: "Summary",
  biography: "One.\n\nTwo.",
  specializations: ["Bharatanatyam"],
  photo: null,
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("festival editions on the website", () => {
  it("never shows a draft or archived edition", async () => {
    mocks.findFestivals.mockResolvedValue([
      festivalRow("2028", "DRAFT"),
      festivalRow("2027", "PUBLISHED"),
      festivalRow("2026", "ARCHIVED"),
    ]);

    const festivals = await getPublicFestivals();

    expect(festivals.map((festival) => festival.year)).toEqual(["2027"]);
    expect(festivals[0]).toMatchObject({
      date: "Monday, October 25, 2027",
      time: "3:00 PM",
      venue: "Auditorium, Sycamore, Illinois",
      ticketUrl: null,
    });
  });

  it("shows nothing, rather than the built-in page, once the portal holds editions but none is published", async () => {
    mocks.findFestivals.mockResolvedValue([festivalRow("2028", "DRAFT")]);

    await expect(getPublicFestivals()).resolves.toEqual([]);
  });

  it("keeps the built-in festival page while the portal has no editions yet", async () => {
    mocks.findFestivals.mockResolvedValue([]);

    await expect(getPublicFestivals()).resolves.toEqual(BUILT_IN_FESTIVALS);
  });

  it("keeps the built-in festival page when the portal's tables cannot be read", async () => {
    mocks.findFestivals.mockRejectedValue(tableMissing);

    await expect(getPublicFestivals()).resolves.toEqual(BUILT_IN_FESTIVALS);
  });
});

describe("performances and press on the website", () => {
  it("asks the database for published records only", async () => {
    mocks.findPerformances.mockResolvedValue([]);
    mocks.findPressItems.mockResolvedValue([]);

    await getPublicPerformances();
    await getPublicPressItems();

    expect(mocks.findPerformances.mock.calls[0][0].where).toEqual({ status: "PUBLISHED" });
    expect(mocks.findPressItems.mock.calls[0][0].where).toEqual({ status: "PUBLISHED" });
  });

  it("finds a performance page only among the published ones", async () => {
    mocks.findPerformances.mockResolvedValue([
      {
        slug: "spring-showcase",
        title: "Spring Showcase",
        eventDate: null,
        venue: null,
        summary: "Summary",
        description: "First.\n\nSecond.",
        cover: null,
        videoUrl: null,
        externalUrl: null,
        media: [],
      },
    ]);

    await expect(getPublicPerformance("spring-showcase")).resolves.toMatchObject({ description: ["First.", "Second."] });
    await expect(getPublicPerformance("a-draft")).resolves.toBeNull();
  });

  it("shows an empty list instead of failing when the tables cannot be read", async () => {
    mocks.findPerformances.mockRejectedValue(tableMissing);
    mocks.findPressItems.mockRejectedValue(tableMissing);

    await expect(getPublicPerformances()).resolves.toEqual([]);
    await expect(getPublicPressItems()).resolves.toEqual([]);
  });
});

describe("profiles and site details on the website", () => {
  it("shows only profiles whose website switch is on", async () => {
    mocks.findProfiles.mockResolvedValue([profileRow("Hidden Teacher", false), profileRow("Shown Teacher", true)]);

    const profiles = await getPublicProfiles();

    expect(profiles.map((profile) => profile.name)).toEqual(["Shown Teacher"]);
    expect(profiles[0].biography).toEqual(["One.", "Two."]);
  });

  it("keeps the two founders while the portal has no profiles or cannot be read", async () => {
    mocks.findProfiles.mockResolvedValueOnce([]).mockRejectedValueOnce(tableMissing);

    await expect(getPublicProfiles()).resolves.toEqual(BUILT_IN_PROFILES);
    await expect(getPublicProfiles()).resolves.toEqual(BUILT_IN_PROFILES);
  });

  it("uses saved website settings, leaving out social links that were cleared", async () => {
    mocks.findSettings.mockResolvedValue({
      contactEmail: "hello@example.com",
      contactPhone: "555-0100",
      whatsappUrl: null,
      facebookUrl: null,
      instagramUrl: "https://www.instagram.com/example/",
      seoDescription: "Search text",
      homeIntro: "Home text",
    });

    await expect(getPublicSiteSettings()).resolves.toEqual({
      email: "hello@example.com",
      phone: "555-0100",
      whatsappUrl: null,
      socialLinks: [{ href: "https://www.instagram.com/example/", label: "Instagram" }],
      seoDescription: "Search text",
      homeIntro: "Home text",
    });
  });

  it("keeps the current contact details until settings are saved, or if they cannot be read", async () => {
    mocks.findSettings.mockResolvedValueOnce(null).mockRejectedValueOnce(tableMissing);

    await expect(getPublicSiteSettings()).resolves.toEqual(DEFAULT_SITE_SETTINGS);
    await expect(getPublicSiteSettings()).resolves.toEqual(DEFAULT_SITE_SETTINGS);
  });
});
