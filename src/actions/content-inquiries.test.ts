import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireContentUser: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/actions/content-access", () => ({ requireContentUser: mocks.requireContentUser }));
vi.mock("@/lib/db", () => ({ db: { inquiry: { findMany: mocks.findMany, count: mocks.count, update: mocks.update } } }));

import { getContentInquiries, getContentInquirySummary, setInquiryStatus } from "@/actions/content-inquiries";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireContentUser.mockResolvedValue({ id: "editor-1", name: "Asha", role: "EDITOR" });
  mocks.findMany.mockResolvedValue([]);
  mocks.count.mockResolvedValue(0);
});

describe("inquiries list", () => {
  it("shows everything except archived inquiries by default, newest first", async () => {
    await getContentInquiries();

    const query = mocks.findMany.mock.calls[0][0];
    expect(query.where.status).toEqual({ not: "ARCHIVED" });
    expect(query.orderBy).toEqual({ createdAt: "desc" });
  });

  it("never sends the rate-limiting fingerprint to the browser", async () => {
    await getContentInquiries();

    expect(mocks.findMany.mock.calls[0][0].select).not.toHaveProperty("senderKey");
  });

  it("filters by status and topic, and searches name, email, and message", async () => {
    await getContentInquiries({ status: "NEW", interest: "Sponsorship", search: "anu" });

    const { where } = mocks.findMany.mock.calls[0][0];
    expect(where).toMatchObject({ status: "NEW", interestedIn: "Sponsorship" });
    expect(where.OR).toHaveLength(3);
  });

  it("pages the results", async () => {
    mocks.count.mockResolvedValue(45);

    await expect(getContentInquiries({ page: 2, pageSize: 20 })).resolves.toMatchObject({ total: 45, pages: 3 });
    expect(mocks.findMany.mock.calls[0][0]).toMatchObject({ skip: 20, take: 20 });
  });

  it("rejects a filter it does not know", async () => {
    await expect(getContentInquiries({ status: "DELETED" as never })).rejects.toThrow();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });
});

describe("the header bell", () => {
  it("counts only new inquiries and lists the latest five without their messages", async () => {
    mocks.count.mockResolvedValue(7);

    await expect(getContentInquirySummary()).resolves.toMatchObject({ newCount: 7 });
    expect(mocks.count).toHaveBeenCalledWith({ where: { status: "NEW" } });
    expect(mocks.findMany.mock.calls[0][0]).toMatchObject({ where: { status: "NEW" }, take: 5 });
    expect(mocks.findMany.mock.calls[0][0].select).toEqual({ id: true, name: true, interestedIn: true, createdAt: true });
  });
});

describe("handling an inquiry", () => {
  it("lets an editor mark an inquiry and records who did", async () => {
    await setInquiryStatus("inq-1", "REPLIED");

    expect(mocks.update.mock.calls[0][0]).toMatchObject({
      where: { id: "inq-1" },
      data: { status: "REPLIED", handledByName: "Asha" },
    });
  });

  it("clears who handled it when an inquiry is put back to new", async () => {
    await setInquiryStatus("inq-1", "NEW");

    expect(mocks.update.mock.calls[0][0].data).toEqual({ status: "NEW", handledByName: null });
  });

  it("rejects a status it does not know", async () => {
    await expect(setInquiryStatus("inq-1", "DELETED" as never)).rejects.toThrow();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
