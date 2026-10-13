import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireContentUser: vi.fn(),
  findFestival: vi.fn(),
  updateFestival: vi.fn(),
  findPerformance: vi.fn(),
  updatePerformance: vi.fn(),
  recordContentAudit: vi.fn(),
  revalidatePublicSite: vi.fn(),
}));

vi.mock("@/actions/content-access", () => ({ requireContentUser: mocks.requireContentUser }));
vi.mock("@/actions/content-service", () => ({
  recordContentAudit: mocks.recordContentAudit,
  revalidatePublicSite: mocks.revalidatePublicSite,
}));
vi.mock("@/lib/db", () => ({
  db: {
    festival: { findUniqueOrThrow: mocks.findFestival, update: mocks.updateFestival },
    performance: { findUniqueOrThrow: mocks.findPerformance, update: mocks.updatePerformance },
  },
}));

import { setContentStatus } from "@/actions/content-status";

const owner = { id: "owner-1", name: "Varsha", role: "OWNER" };
const editor = { id: "editor-1", name: "Asha", role: "EDITOR" };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireContentUser.mockResolvedValue(owner);
  mocks.findFestival.mockResolvedValue({ status: "DRAFT", year: "2027" });
});

describe("publishing content", () => {
  it("records who published and when, and refreshes the pages that show it", async () => {
    await expect(setContentStatus("festival", "f1", "PUBLISHED")).resolves.toEqual({ status: "PUBLISHED" });

    expect(mocks.updateFestival).toHaveBeenCalledWith({
      where: { id: "f1" },
      data: { status: "PUBLISHED", publishedAt: expect.any(Date), publishedById: "owner-1", publishedByName: "Varsha" },
    });
    expect(mocks.revalidatePublicSite).toHaveBeenCalledWith(["/ananta", "/ananta/2027"]);
    expect(mocks.recordContentAudit).toHaveBeenCalledWith(
      owner,
      expect.objectContaining({ action: "published", entityType: "festival", entityId: "f1" }),
    );
  });

  it("refuses an editor even when the request is sent directly, and changes nothing", async () => {
    mocks.requireContentUser.mockResolvedValue(editor);

    await expect(setContentStatus("festival", "f1", "PUBLISHED")).rejects.toThrow("Only a Content Owner");
    expect(mocks.updateFestival).not.toHaveBeenCalled();
    expect(mocks.revalidatePublicSite).not.toHaveBeenCalled();
  });

  it("takes content off the website without touching its publishing record", async () => {
    mocks.findPerformance.mockResolvedValue({ status: "PUBLISHED", title: "Spring Showcase", slug: "spring-showcase" });

    await setContentStatus("performance", "p1", "ARCHIVED");

    expect(mocks.updatePerformance).toHaveBeenCalledWith({ where: { id: "p1" }, data: { status: "ARCHIVED" } });
    expect(mocks.revalidatePublicSite).toHaveBeenCalledWith(["/performances", "/performances/spring-showcase"]);
  });

  it("does not let archived content be published in one step", async () => {
    mocks.findFestival.mockResolvedValue({ status: "ARCHIVED", year: "2025" });

    await expect(setContentStatus("festival", "f1", "PUBLISHED")).rejects.toThrow("cannot be changed");
    expect(mocks.updateFestival).not.toHaveBeenCalled();
  });

  it("rejects an unknown kind of content or status", async () => {
    await expect(setContentStatus("student" as never, "x", "PUBLISHED")).rejects.toThrow();
    await expect(setContentStatus("festival", "f1", "LIVE" as never)).rejects.toThrow();
    expect(mocks.updateFestival).not.toHaveBeenCalled();
  });
});
