import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  recalculateBilling: vi.fn(),
  db: {
    monthlyStudentBilling: { findMany: vi.fn(), update: vi.fn() },
    enrollment: { findMany: vi.fn(), findUniqueOrThrow: vi.fn() },
  },
}));

vi.mock("@/actions/billing", () => ({ recalculateBilling: mocks.recalculateBilling }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));

import {
  recalculateAffectedBills,
  recalculateClassMonthBills,
  recalculateEnrollmentRangeBills,
} from "@/actions/billing-impact";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.recalculateBilling.mockResolvedValue({ id: "bill" });
});

describe("central billing-impact recalculation", () => {
  it("recalculates each bill once while payment ledgers remain preserved", async () => {
    mocks.db.monthlyStudentBilling.findMany.mockResolvedValue([
      { id: "unpaid", payments: [] },
      { id: "unpaid", payments: [] },
      { id: "paid", payments: [{ id: "payment" }] },
    ]);

    await expect(recalculateAffectedBills({ id: { in: ["unpaid", "paid"] } })).resolves.toEqual({
      recalculated: 2,
      skippedWithPayments: 0,
    });
    expect(mocks.recalculateBilling).toHaveBeenCalledTimes(2);
    expect(mocks.recalculateBilling).toHaveBeenCalledWith("unpaid");
    expect(mocks.recalculateBilling).toHaveBeenCalledWith("paid");
    expect(mocks.db.monthlyStudentBilling.update).not.toHaveBeenCalled();
  });

  it("does not hide a genuine recalculation failure", async () => {
    mocks.db.monthlyStudentBilling.findMany.mockResolvedValue([{ id: "bill", payments: [] }]);
    mocks.recalculateBilling.mockRejectedValue(
      new Error("This bill has payments recorded against it and can no longer be recalculated."),
    );

    await expect(recalculateAffectedBills({ id: "bill" })).rejects.toThrow("payments recorded");
  });

  it("targets enrolled students for a class-month change", async () => {
    mocks.db.enrollment.findMany.mockResolvedValue([
      { studentId: "student-a", student: { familyId: "family-a" } },
      { studentId: "student-b", student: { familyId: "family-b" } },
    ]);
    mocks.db.monthlyStudentBilling.findMany.mockResolvedValue([]);
    const month = new Date("2026-09-01T00:00:00.000Z");

    await recalculateClassMonthBills("class", month, false);

    expect(mocks.db.monthlyStudentBilling.findMany).toHaveBeenCalledWith({
      where: { month, student: { id: { in: ["student-a", "student-b"] } } },
      select: { id: true, payments: { select: { id: true } } },
    });
  });

  it("includes family bills in an enrollment pause range for sibling discounts", async () => {
    mocks.db.enrollment.findUniqueOrThrow.mockResolvedValue({ student: { familyId: "family" } });
    mocks.db.monthlyStudentBilling.findMany.mockResolvedValue([]);
    const startMonth = new Date("2026-08-01T00:00:00.000Z");
    const endMonth = new Date("2026-09-01T00:00:00.000Z");

    await recalculateEnrollmentRangeBills("enrollment", startMonth, endMonth);

    expect(mocks.db.monthlyStudentBilling.findMany).toHaveBeenCalledWith({
      where: {
        month: { gte: startMonth, lt: new Date("2026-10-01T00:00:00.000Z") },
        student: { familyId: "family" },
      },
      select: { id: true, payments: { select: { id: true } } },
    });
  });
});
