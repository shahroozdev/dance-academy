import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    enrollment: { findUniqueOrThrow: vi.fn(), delete: vi.fn() },
    monthlyBillingLineItem: { findMany: vi.fn(), deleteMany: vi.fn() },
    monthlyStudentBilling: { findMany: vi.fn() },
  };
  return { requireAdmin: vi.fn(), recalculateBilling: vi.fn(), tx, transaction: vi.fn() };
});

vi.mock("@/actions/access", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/actions/billing", () => ({ recalculateBilling: mocks.recalculateBilling }));
vi.mock("@/lib/db", () => ({ db: { $transaction: mocks.transaction } }));

import { deleteEnrollment } from "@/actions/enrollments";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue({ id: "admin" });
  mocks.transaction.mockImplementation((work: (tx: typeof mocks.tx) => Promise<unknown>) => work(mocks.tx));
  mocks.tx.enrollment.findUniqueOrThrow.mockResolvedValue({ id: "enrollment", student: { familyId: "family" } });
  mocks.tx.enrollment.delete.mockResolvedValue({ id: "enrollment" });
  mocks.tx.monthlyBillingLineItem.deleteMany.mockResolvedValue({ count: 1 });
});

describe("deleteEnrollment", () => {
  it("removes an accidental enrollment and recalculates its unpaid bill", async () => {
    mocks.tx.monthlyBillingLineItem.findMany.mockResolvedValue([
      { billing: { id: "student-bill", month: new Date("2026-09-01"), payments: [] } },
    ]);
    mocks.tx.monthlyStudentBilling.findMany.mockResolvedValue([{ id: "student-bill" }, { id: "sibling-bill" }]);
    await expect(deleteEnrollment("enrollment")).resolves.toEqual({ deleted: true, recalculatedBills: 2 });
    expect(mocks.tx.enrollment.delete).toHaveBeenCalledWith({ where: { id: "enrollment" } });
    expect(mocks.recalculateBilling).toHaveBeenCalledWith("student-bill");
    expect(mocks.recalculateBilling).toHaveBeenCalledWith("sibling-bill");
  });

  it("protects an enrollment connected to a payment", async () => {
    mocks.tx.monthlyBillingLineItem.findMany.mockResolvedValue([
      { billing: { id: "bill", month: new Date("2026-09-01"), payments: [{ id: "payment" }] } },
    ]);
    await expect(deleteEnrollment("enrollment")).rejects.toThrow("connected to a bill with a payment");
    expect(mocks.tx.enrollment.delete).not.toHaveBeenCalled();
  });
});
