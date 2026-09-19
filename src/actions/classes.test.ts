import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  recalculateAllClassFamilyBills: vi.fn(),
  tx: {
    class: { update: vi.fn() },
    classMonthlyFee: { deleteMany: vi.fn() },
  },
  db: {
    classMonthlyFee: { findUnique: vi.fn(), update: vi.fn(), deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/actions/access", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/actions/billing-impact", () => ({
  recalculateAllClassFamilyBills: mocks.recalculateAllClassFamilyBills,
}));
vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { updateClass } from "@/actions/classes";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue({ id: "admin" });
  mocks.db.$transaction.mockImplementation((work) => work(mocks.tx));
  mocks.tx.class.update.mockResolvedValue({
    id: "class",
    firstClassDate: new Date("2026-09-18T00:00:00.000Z"),
    dayOfWeek: "WEDNESDAY",
    standardRate: 20,
    pricingType: "REGULAR",
  });
  mocks.db.classMonthlyFee.findUnique.mockResolvedValue({ id: "fee", isOverridden: false });
  mocks.recalculateAllClassFamilyBills.mockResolvedValue({ recalculated: 1, skippedWithPayments: 0 });
});

describe("updateClass billing impact", () => {
  it("refreshes the default opening-month fee and recalculates affected family bills", async () => {
    await updateClass("class", { firstClassDate: "2026-09-18" });

    expect(mocks.db.classMonthlyFee.update).toHaveBeenCalledWith({
      where: { id: "fee" },
      data: {
        billableSessions: 2,
        rate: 20,
        flatFee: null,
        monthlyClassFee: 40,
        isFinalized: false,
        finalizedAt: null,
      },
    });
    expect(mocks.recalculateAllClassFamilyBills).toHaveBeenCalledWith("class");
    expect(mocks.db.classMonthlyFee.deleteMany).toHaveBeenCalledWith({
      where: {
        classId: "class",
        month: { lt: new Date("2026-09-01T00:00:00.000Z") },
        lineItems: { none: {} },
      },
    });
  });

  it("does not overwrite a staff-customized opening-month fee", async () => {
    mocks.db.classMonthlyFee.findUnique.mockResolvedValue({ id: "fee", isOverridden: true });

    await updateClass("class", { firstClassDate: "2026-09-18" });

    expect(mocks.db.classMonthlyFee.update).not.toHaveBeenCalled();
    expect(mocks.recalculateAllClassFamilyBills).toHaveBeenCalledWith("class");
  });
});
