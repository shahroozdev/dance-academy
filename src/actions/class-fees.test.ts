import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  recalculateBilling: vi.fn(),
  db: {
    classMonthlyFee: { update: vi.fn() },
    monthlyBillingLineItem: { findMany: vi.fn() },
  },
}));

vi.mock("@/actions/access", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/actions/billing", () => ({ recalculateBilling: mocks.recalculateBilling }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));

import {
  markClassMonthlyFeeNoClasses,
  recalculateClassMonthlyFeeBills,
} from "@/actions/class-fees";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue({ id: "admin" });
  mocks.db.classMonthlyFee.update.mockResolvedValue({ id: "fee" });
});

describe("markClassMonthlyFeeNoClasses", () => {
  it("sets the selected class-month to zero and requires staff to finalize it again", async () => {
    await markClassMonthlyFeeNoClasses("fee");

    expect(mocks.db.classMonthlyFee.update).toHaveBeenCalledWith({
      where: { id: "fee" },
      data: {
        billableSessions: 0,
        flatFee: 0,
        monthlyClassFee: 0,
        notes: "No classes — break/inactive month",
        isOverridden: true,
        isFinalized: false,
        finalizedAt: null,
      },
    });
  });
});

describe("recalculateClassMonthlyFeeBills", () => {
  it("recalculates each unpaid bill once and protects bills that already have payments", async () => {
    mocks.db.monthlyBillingLineItem.findMany.mockResolvedValue([
      { billing: { id: "unpaid", payments: [] } },
      { billing: { id: "unpaid", payments: [] } },
      { billing: { id: "paid", payments: [{ id: "payment" }] } },
    ]);
    mocks.recalculateBilling.mockResolvedValue({ id: "unpaid" });

    await expect(recalculateClassMonthlyFeeBills("fee")).resolves.toEqual({
      recalculated: 1,
      skippedWithPayments: 1,
    });
    expect(mocks.recalculateBilling).toHaveBeenCalledTimes(1);
    expect(mocks.recalculateBilling).toHaveBeenCalledWith("unpaid");
  });
});
