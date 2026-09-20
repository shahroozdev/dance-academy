import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  recalculateAffectedBills: vi.fn(),
  db: {
    classMonthlyFee: { update: vi.fn() },
  },
}));

vi.mock("@/actions/access", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/actions/billing-impact", () => ({ recalculateAffectedBills: mocks.recalculateAffectedBills }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));

import {
  markClassMonthlyFeeNoClasses,
  recalculateClassMonthlyFeeBills,
  updateClassMonthlyFee,
} from "@/actions/class-fees";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue({ id: "admin" });
  mocks.db.classMonthlyFee.update.mockResolvedValue({ id: "fee" });
  mocks.recalculateAffectedBills.mockResolvedValue({ recalculated: 0, skippedWithPayments: 0 });
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

describe("updateClassMonthlyFee", () => {
  it("automatically applies an override to unpaid bills and flags paid bills for review", async () => {
    mocks.recalculateAffectedBills.mockResolvedValue({ recalculated: 1, skippedWithPayments: 1 });

    await updateClassMonthlyFee("fee", {
      billableSessions: 3,
      rate: 20,
      monthlyClassFee: 60,
      notes: "Extra rehearsal",
    });

    expect(mocks.recalculateAffectedBills).toHaveBeenCalledWith(
      { lineItems: { some: { classMonthlyFeeId: "fee" } } },
      expect.stringContaining("class fee changed"),
    );
  });
});

describe("recalculateClassMonthlyFeeBills", () => {
  it("recalculates each unpaid bill once and protects bills that already have payments", async () => {
    mocks.recalculateAffectedBills.mockResolvedValue({ recalculated: 1, skippedWithPayments: 1 });

    await expect(recalculateClassMonthlyFeeBills("fee")).resolves.toEqual({
      recalculated: 1,
      skippedWithPayments: 1,
    });
    expect(mocks.recalculateAffectedBills).toHaveBeenCalledWith({
      lineItems: { some: { classMonthlyFeeId: "fee" } },
    }, expect.any(String));
  });
});
