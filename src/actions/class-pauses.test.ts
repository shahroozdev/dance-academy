import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  recalculateClassRangeBills: vi.fn(),
  db: {
    classBillingPause: { findFirst: vi.fn(), create: vi.fn(), delete: vi.fn() },
    classMonthlyFee: { updateMany: vi.fn() },
  },
}));

vi.mock("@/actions/access", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/actions/billing-impact", () => ({ recalculateClassRangeBills: mocks.recalculateClassRangeBills }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { createClassBillingPause } from "@/actions/class-pauses";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue({ id: "admin" });
  mocks.db.classBillingPause.findFirst.mockResolvedValue(null);
  mocks.db.classBillingPause.create.mockResolvedValue({ id: "break" });
  mocks.db.classMonthlyFee.updateMany.mockResolvedValue({ count: 1 });
  mocks.recalculateClassRangeBills.mockResolvedValue({ recalculated: 1, skippedWithPayments: 0 });
});

describe("class billing breaks", () => {
  it("stores an inclusive month range before billing runs", async () => {
    await createClassBillingPause("class", { startMonth: "2026-06", endMonth: "2026-08", reason: "Summer break" });
    expect(mocks.db.classBillingPause.create).toHaveBeenCalledWith({
      data: {
        classId: "class",
        startMonth: new Date("2026-06-01T00:00:00.000Z"),
        endMonth: new Date("2026-08-01T00:00:00.000Z"),
        reason: "Summer break",
      },
    });
    expect(mocks.recalculateClassRangeBills).toHaveBeenCalledWith(
      "class",
      new Date("2026-06-01T00:00:00.000Z"),
      new Date("2026-08-01T00:00:00.000Z"),
    );
  });

  it("rejects overlapping class-break ranges", async () => {
    mocks.db.classBillingPause.findFirst.mockResolvedValue({ id: "existing" });
    await expect(createClassBillingPause("class", {
      startMonth: "2026-08",
      endMonth: "2026-08",
      reason: "Break",
    })).rejects.toThrow("already has a break");
  });
});
