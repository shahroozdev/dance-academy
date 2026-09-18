import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    family: { findUniqueOrThrow: vi.fn(), update: vi.fn(), delete: vi.fn() },
    familyGuardian: { findUniqueOrThrow: vi.fn(), updateMany: vi.fn(), update: vi.fn(), createMany: vi.fn() },
    student: { updateMany: vi.fn() },
    registrationRequest: { updateMany: vi.fn() },
    notificationLog: { updateMany: vi.fn() },
    monthlyStudentBilling: { findMany: vi.fn() },
  };
  return { requireAdmin: vi.fn(), recalculateBilling: vi.fn(), transaction: vi.fn(), tx };
});

vi.mock("@/actions/access", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/actions/billing", () => ({ recalculateBilling: mocks.recalculateBilling }));
vi.mock("@/lib/db", () => ({ db: { $transaction: mocks.transaction } }));

import { combineFamilies, setPrimaryFamilyGuardian } from "@/actions/family-guardians";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue({ id: "admin" });
  mocks.transaction.mockImplementation((work: (tx: typeof mocks.tx) => Promise<unknown>) => work(mocks.tx));
});

describe("family guardian controls", () => {
  it("changes the primary billing contact and synchronizes the family contact", async () => {
    mocks.tx.familyGuardian.findUniqueOrThrow.mockResolvedValue({
      id: "guardian",
      familyId: "family",
      name: "Dad",
      email: "dad@example.com",
      phone: "+12025550123",
    });
    await setPrimaryFamilyGuardian("guardian");
    expect(mocks.tx.family.update).toHaveBeenCalledWith({
      where: { id: "family" },
      data: { parentGuardianName: "Dad", email: "dad@example.com", phone: "+12025550123" },
    });
  });

  it("combines students and guardians, removes the duplicate, and recalculates unpaid bills", async () => {
    mocks.tx.family.findUniqueOrThrow
      .mockResolvedValueOnce({
        id: "source",
        guardians: [{ id: "g1", name: "Dad", relationship: "Father", email: "dad@example.com", phone: "+12025550123" }],
      })
      .mockResolvedValueOnce({ id: "target", guardians: [] });
    mocks.tx.monthlyStudentBilling.findMany.mockResolvedValue([{ id: "bill" }]);
    await expect(combineFamilies("source", "target")).resolves.toEqual({ targetFamilyId: "target", recalculatedBills: 1 });
    expect(mocks.tx.student.updateMany).toHaveBeenCalledWith({ where: { familyId: "source" }, data: { familyId: "target" } });
    expect(mocks.tx.family.delete).toHaveBeenCalledWith({ where: { id: "source" } });
    expect(mocks.recalculateBilling).toHaveBeenCalledWith("bill");
  });
});
