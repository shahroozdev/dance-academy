import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  recalculateBilling: vi.fn(),
  db: {
    student: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    monthlyStudentBilling: { findMany: vi.fn() },
  },
}));

vi.mock("@/actions/access", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/actions/billing", () => ({ recalculateBilling: mocks.recalculateBilling }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { updateStudent } from "@/actions/students";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue({ id: "admin" });
  mocks.db.student.findUniqueOrThrow.mockResolvedValue({ familyId: "old-family" });
  mocks.db.student.update.mockResolvedValue({ id: "student", familyId: "new-family" });
  mocks.db.monthlyStudentBilling.findMany.mockResolvedValue([{ id: "bill-a" }, { id: "bill-b" }]);
});

describe("moving a student into an existing family", () => {
  it("recalculates unpaid bills in both families for the sibling discount", async () => {
    await updateStudent("student", { familyId: "new-family" });
    expect(mocks.db.monthlyStudentBilling.findMany).toHaveBeenCalledWith({
      where: {
        student: { familyId: { in: ["old-family", "new-family"] } },
        payments: { none: {} },
      },
      select: { id: true },
    });
    expect(mocks.recalculateBilling).toHaveBeenCalledTimes(2);
    expect(mocks.recalculateBilling).toHaveBeenCalledWith("bill-a");
    expect(mocks.recalculateBilling).toHaveBeenCalledWith("bill-b");
  });

  it("does not recalculate family bills when the family did not change", async () => {
    await updateStudent("student", { familyId: "old-family" });
    expect(mocks.db.monthlyStudentBilling.findMany).not.toHaveBeenCalled();
    expect(mocks.recalculateBilling).not.toHaveBeenCalled();
  });
});
