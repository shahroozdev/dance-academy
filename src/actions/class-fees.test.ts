import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  recalculateClassMonthBills: vi.fn(),
  db: {
    classMonthlyFee: { update: vi.fn(), findUniqueOrThrow: vi.fn() },
  },
}));

vi.mock("@/actions/access", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/actions/billing-impact", () => ({ recalculateClassMonthBills: mocks.recalculateClassMonthBills }));
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
  mocks.db.classMonthlyFee.findUniqueOrThrow.mockResolvedValue({
    classId: "class",
    month: new Date("2026-10-01T00:00:00.000Z"),
  });
  mocks.recalculateClassMonthBills.mockResolvedValue({ recalculated: 0, skippedWithPayments: 0 });
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
  it("automatically applies an override to affected bills while preserving payments", async () => {
    mocks.recalculateClassMonthBills.mockResolvedValue({ recalculated: 2, skippedWithPayments: 0 });

    await updateClassMonthlyFee("fee", {
      billableSessions: 3,
      rate: 20,
      monthlyClassFee: 60,
      notes: "Extra rehearsal",
    });

    expect(mocks.recalculateClassMonthBills).toHaveBeenCalledWith(
      "class",
      new Date("2026-10-01T00:00:00.000Z"),
      true,
      expect.stringContaining("class fee changed"),
    );
  });
});

describe("recalculateClassMonthlyFeeBills", () => {
  it("recalculates each affected bill while preserving recorded payments", async () => {
    mocks.recalculateClassMonthBills.mockResolvedValue({ recalculated: 2, skippedWithPayments: 0 });

    await expect(recalculateClassMonthlyFeeBills("fee")).resolves.toEqual({
      recalculated: 2,
      skippedWithPayments: 0,
    });
    expect(mocks.recalculateClassMonthBills).toHaveBeenCalledWith(
      "class",
      new Date("2026-10-01T00:00:00.000Z"),
      true,
      expect.any(String),
    );
  });
});
