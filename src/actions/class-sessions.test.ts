import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  recalculateClassMonthlyFeeBills: vi.fn(),
  db: {
    class: { findMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    classMonthlyFee: { upsert: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/actions/access", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/actions/class-fees", () => ({ recalculateClassMonthlyFeeBills: mocks.recalculateClassMonthlyFeeBills }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));

import {
  applyReportedClassSessions,
  getMonthlyClassSessionTracking,
  reportMonthlyClassSessions,
} from "@/actions/class-sessions";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue({ id: "admin" });
  mocks.recalculateClassMonthlyFeeBills.mockResolvedValue({ recalculated: 2, skippedWithPayments: 1 });
});

describe("monthly class session reporting", () => {
  it("lists only classes that were billable in the selected month", async () => {
    mocks.db.class.findMany.mockResolvedValue([]);
    const month = new Date("2026-10-01T00:00:00.000Z");

    await getMonthlyClassSessionTracking("2026-10");

    expect(mocks.db.class.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        firstClassDate: { lt: new Date("2026-11-01T00:00:00.000Z") },
        OR: [{ inactiveFromMonth: null }, { inactiveFromMonth: { gt: month } }],
      },
      include: expect.objectContaining({
        extraSessions: {
          where: { sessionDate: { gte: month, lt: new Date("2026-11-01T00:00:00.000Z") } },
          select: { id: true },
        },
      }),
    }));
  });

  it("shows extra rehearsals separately so they are not counted twice", async () => {
    mocks.db.class.findMany.mockResolvedValue([{
      id: "class",
      name: "Bollywood",
      dayOfWeek: "THURSDAY",
      firstClassDate: new Date("2026-09-01T00:00:00.000Z"),
      standardRate: 20,
      pricingType: "REGULAR",
      teacher: null,
      program: { name: "Bollywood" },
      monthlyFees: [],
      extraSessions: [{ id: "extra-1" }, { id: "extra-2" }],
    }]);

    const [row] = await getMonthlyClassSessionTracking("2026-10");

    expect(row.additionalSessions).toBe(2);
    expect(row.reportedSessions).toBeNull();
  });

  it("saves a teacher count as a draft without changing billing", async () => {
    mocks.db.class.findUniqueOrThrow.mockResolvedValue({
      id: "class",
      dayOfWeek: "THURSDAY",
      firstClassDate: new Date("2026-09-01T00:00:00.000Z"),
      standardRate: 20,
      pricingType: "REGULAR",
    });
    mocks.db.classMonthlyFee.upsert.mockResolvedValue({ id: "fee" });

    await reportMonthlyClassSessions({ classId: "class", month: "2026-10", reportedSessions: 3, reportNotes: "One cancellation" });

    expect(mocks.db.classMonthlyFee.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ reportedSessions: 3, reportNotes: "One cancellation" }),
    }));
    expect(mocks.recalculateClassMonthlyFeeBills).not.toHaveBeenCalled();
  });

  it("applies a reported count only after explicit review and recalculates unpaid bills", async () => {
    mocks.db.classMonthlyFee.findUniqueOrThrow.mockResolvedValue({
      id: "fee",
      reportedSessions: 3,
      reportNotes: "One cancellation",
      rate: 20,
      class: { standardRate: 20, pricingType: "REGULAR" },
    });

    await expect(applyReportedClassSessions("fee")).resolves.toEqual({
      applied: true,
      recalculated: 2,
      skippedWithPayments: 1,
    });
    expect(mocks.db.classMonthlyFee.update).toHaveBeenCalledWith({
      where: { id: "fee" },
      data: {
        billableSessions: 3,
        rate: 20,
        monthlyClassFee: 60,
        notes: "One cancellation",
        isOverridden: true,
        isFinalized: false,
        finalizedAt: null,
      },
    });
  });
});
