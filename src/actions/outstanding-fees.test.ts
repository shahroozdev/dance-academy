import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    class: { findMany: vi.fn() },
    student: { count: vi.fn() },
    monthlyStudentBilling: { findMany: vi.fn(), count: vi.fn(), aggregate: vi.fn() },
  },
}));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/actions/access", () => ({ requireAdmin: vi.fn().mockResolvedValue({ id: "admin" }) }));

import { getOutstandingFees } from "@/actions/outstanding-fees";

const row = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  studentId: `student-${id}`,
  month: new Date("2026-10-01T00:00:00.000Z"),
  finalAmountDue: 60,
  amountPaid: 0,
  balance: 60,
  multiClassDiscount: 0,
  siblingDiscount: 0,
  adjustment: 0,
  student: { fullName: `Student ${id}`, family: { familyName: "Family" } },
  lineItems: [{ amount: 60, classMonthlyFee: { class: { id: "western", name: "2026 Western ", discountEligible: true, pricingType: "REGULAR" } } }],
  payments: [],
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.db.class.findMany.mockResolvedValue([{ id: "western", name: "2026 Western " }]);
});

describe("getOutstandingFees — all classes", () => {
  it("asks the database for only the requested page, with counts and the total from the database", async () => {
    mocks.db.monthlyStudentBilling.findMany.mockResolvedValue([row("b21"), row("b22")]);
    mocks.db.monthlyStudentBilling.count.mockResolvedValue(42);
    mocks.db.student.count.mockResolvedValue(30);
    mocks.db.monthlyStudentBilling.aggregate.mockResolvedValue({ _sum: { balance: 2520.5 } });

    const result = await getOutstandingFees({ page: 2, pageSize: 20 });

    expect(mocks.db.monthlyStudentBilling.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.db.monthlyStudentBilling.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { balance: { gt: 0 } },
      skip: 20,
      take: 20,
    }));
    expect(mocks.db.monthlyStudentBilling.count).toHaveBeenCalledWith({ where: { balance: { gt: 0 } } });
    expect(mocks.db.student.count).toHaveBeenCalledWith({ where: { monthlyBillings: { some: { balance: { gt: 0 } } } } });
    expect(result).toMatchObject({
      classId: null,
      total: 42,
      pages: 3,
      studentCount: 30,
      amountDue: 2520.5,
      classOptions: [{ id: "western", name: "2026 Western" }],
    });
    expect(result.data.map((bill) => bill.billingId)).toEqual(["b21", "b22"]);
    expect(result.data[0].pendingClasses).toEqual([{ classId: "western", className: "2026 Western", pending: 60 }]);
  });

  it("falls back to page 1 and the default page size for missing or oversized values", async () => {
    mocks.db.monthlyStudentBilling.findMany.mockResolvedValue([]);
    mocks.db.monthlyStudentBilling.count.mockResolvedValue(0);
    mocks.db.student.count.mockResolvedValue(0);
    mocks.db.monthlyStudentBilling.aggregate.mockResolvedValue({ _sum: { balance: null } });

    await getOutstandingFees({ pageSize: 5000 });
    expect(mocks.db.monthlyStudentBilling.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 20 }));
  });
});

describe("getOutstandingFees — one class (interim, see summarizeClassOutstanding)", () => {
  it("narrows in the database to unpaid bills containing the class, then applies the allocation rule", async () => {
    mocks.db.monthlyStudentBilling.findMany.mockResolvedValue([
      row("owed"),
      row("covered", { amountPaid: 60, balance: 0 }),
      row("class-paid", { finalAmountDue: 120, amountPaid: 60, balance: 60, payments: [{ classId: "western", amount: 60 }], lineItems: [
        { amount: 60, classMonthlyFee: { class: { id: "western", name: "2026 Western", discountEligible: false, pricingType: "REGULAR" } } },
        { amount: 60, classMonthlyFee: { class: { id: "bn", name: "Bharatanatyam", discountEligible: false, pricingType: "REGULAR" } } },
      ] }),
    ]);

    const result = await getOutstandingFees({ classId: "western", page: 1, pageSize: 20 });

    expect(mocks.db.monthlyStudentBilling.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { balance: { gt: 0 }, lineItems: { some: { classMonthlyFee: { classId: "western" } } } },
    }));
    expect(mocks.db.monthlyStudentBilling.count).not.toHaveBeenCalled();
    expect(result).toMatchObject({ classId: "western", total: 1, studentCount: 1, amountDue: 60 });
    expect(result.data.map((bill) => bill.billingId)).toEqual(["owed"]);
  });
});
