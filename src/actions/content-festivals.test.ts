import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireContentUser: vi.fn(),
  findUnique: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteArtists: vi.fn(),
  deleteMedia: vi.fn(),
  transaction: vi.fn(),
  assertAssetKinds: vi.fn(),
  recordContentAudit: vi.fn(),
  revalidatePublicSite: vi.fn(),
}));

vi.mock("@/actions/content-access", () => ({ requireContentUser: mocks.requireContentUser }));
vi.mock("@/actions/content-service", () => ({
  assertAssetKinds: mocks.assertAssetKinds,
  recordContentAudit: mocks.recordContentAudit,
  revalidatePublicSite: mocks.revalidatePublicSite,
}));
vi.mock("@/lib/db", () => ({
  db: {
    festival: {
      findUnique: mocks.findUnique,
      findUniqueOrThrow: mocks.findUniqueOrThrow,
      create: mocks.create,
      update: mocks.update,
    },
    festivalArtist: { deleteMany: mocks.deleteArtists },
    festivalMedia: { deleteMany: mocks.deleteMedia },
    $transaction: mocks.transaction,
  },
}));

import { createFestival, updateFestival } from "@/actions/content-festivals";
import type { FestivalInput } from "@/actions/content.schema";

const owner = { id: "owner-1", name: "Varsha", role: "OWNER" };
const editor = { id: "editor-1", name: "Asha", role: "EDITOR" };

const festival: FestivalInput = {
  year: "2027",
  label: "Second edition",
  eventDate: "2027-10-24",
  startTime: "15:00",
  venueName: "Sycamore High School Auditorium",
  venueTown: "Sycamore",
  venueRegion: "IL",
  venueStreet: "",
  venuePostalCode: "",
  summary: "Two classical traditions with live music.",
  ticketUrl: "",
  artists: [{ name: "Dr. Neena Prasad", artForm: "Mohiniyattam", biography: "", photoId: "" }],
  media: [{ assetId: "asset-1", role: "POSTER", caption: "", linkUrl: "" }],
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireContentUser.mockResolvedValue(editor);
  mocks.findUnique.mockResolvedValue(null);
  mocks.create.mockResolvedValue({ id: "f1" });
});

describe("creating a festival edition", () => {
  it("always starts as a draft, with empty optional fields stored as nothing", async () => {
    await expect(createFestival(festival)).resolves.toEqual({ id: "f1" });

    const { data } = mocks.create.mock.calls[0][0];
    expect(data).not.toHaveProperty("status");
    expect(data).toMatchObject({ year: "2027", venueStreet: null, ticketUrl: null });
    expect(data.eventDate.toISOString()).toBe("2027-10-24T00:00:00.000Z");
    expect(data.artists.create).toEqual([
      { name: "Dr. Neena Prasad", artForm: "Mohiniyattam", biography: null, photoId: null, sortOrder: 0 },
    ]);
    expect(mocks.revalidatePublicSite).not.toHaveBeenCalled();
  });

  it("refuses a second edition for the same year", async () => {
    mocks.findUnique.mockResolvedValue({ id: "other" });

    await expect(createFestival(festival)).rejects.toThrow("A festival for 2027 already exists");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it.each([
    ["a year that is not four digits", { year: "27" }],
    ["a ticket link that is not a web address", { ticketUrl: "javascript:alert(1)" }],
    ["a media row with no file chosen", { media: [{ assetId: "", role: "POSTER" as const, caption: "", linkUrl: "" }] }],
  ])("rejects %s before anything is saved", async (_, change) => {
    await expect(createFestival({ ...festival, ...change })).rejects.toThrow();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("checks that a poster is an image and a video row is a video", async () => {
    await createFestival({ ...festival, media: [...festival.media, { assetId: "asset-2", role: "VIDEO", caption: "", linkUrl: "" }] });

    expect(mocks.assertAssetKinds).toHaveBeenCalledWith([
      expect.objectContaining({ assetId: "asset-1", kind: "IMAGE" }),
      expect.objectContaining({ assetId: "asset-2", kind: "VIDEO" }),
    ]);
  });
});

describe("revising a festival edition", () => {
  it("does not let an editor change a published edition", async () => {
    mocks.findUniqueOrThrow.mockResolvedValue({ status: "PUBLISHED", year: "2027" });

    await expect(updateFestival("f1", festival)).rejects.toThrow("Only a Content Owner can change published content");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("lets an editor keep working on a draft, which stays a draft and off the website", async () => {
    mocks.findUniqueOrThrow.mockResolvedValue({ status: "DRAFT", year: "2027" });

    await expect(updateFestival("f1", festival)).resolves.toEqual({ id: "f1", status: "DRAFT" });
    expect(mocks.revalidatePublicSite).not.toHaveBeenCalled();
  });

  it("returns a published edition to draft when an owner revises it, and refreshes its pages", async () => {
    mocks.requireContentUser.mockResolvedValue(owner);
    mocks.findUniqueOrThrow.mockResolvedValue({ status: "PUBLISHED", year: "2027" });
    mocks.findUnique.mockResolvedValue({ id: "f1" });

    await expect(updateFestival("f1", festival)).resolves.toEqual({ id: "f1", status: "DRAFT" });

    expect(mocks.update.mock.calls[0][0]).toMatchObject({ where: { id: "f1" }, data: { status: "DRAFT" } });
    expect(mocks.revalidatePublicSite).toHaveBeenCalledWith(["/ananta", "/ananta/2027"]);
    expect(mocks.recordContentAudit).toHaveBeenCalledWith(
      owner,
      expect.objectContaining({ summary: expect.stringContaining("returned to draft") }),
    );
  });
});
