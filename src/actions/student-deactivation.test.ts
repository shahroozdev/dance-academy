import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    student: { update: vi.fn() },
    enrollment: { findMany: vi.fn(), updateMany: vi.fn() },
  };
  return {
    tx,
    transaction: vi.fn(),
    requireAdmin: vi.fn(),
    recalculateEnrollmentRangeBills: vi.fn(),
  };
});

vi.mock("@/actions/access", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/actions/billing-impact", () => ({
  recalculateEnrollmentRangeBills: mocks.recalculateEnrollmentRangeBills,
}));
vi.mock("@/lib/db", () => ({ db: { $transaction: mocks.transaction } }));

import { toggleStudentActive } from "@/actions/students";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue({ id: "admin" });
  mocks.transaction.mockImplementation((work: (tx: typeof mocks.tx) => Promise<unknown>) => work(mocks.tx));
  mocks.tx.student.update.mockResolvedValue({ id: "student", isActive: false });
  mocks.tx.enrollment.findMany.mockResolvedValue([
    { id: "enrollment", startDate: new Date("2026-09-10T00:00:00.000Z") },
  ]);
  mocks.recalculateEnrollmentRangeBills.mockResolvedValue({ recalculated: 1, skippedWithPayments: 0 });
});

describe("student deactivation", () => {
  it("ends active enrollments on the selected last class date and recalculates billing", async () => {
    await toggleStudentActive("student", false, "2026-09-24");

    expect(mocks.tx.enrollment.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["enrollment"] } },
      data: { status: "ENDED", endDate: new Date("2026-09-24T00:00:00.000Z") },
    });
    expect(mocks.recalculateEnrollmentRangeBills).toHaveBeenCalledWith(
      "enrollment",
      undefined,
      undefined,
      expect.stringContaining("last class date"),
    );
  });

  it("rejects a last class date before an active enrollment started", async () => {
    await expect(toggleStudentActive("student", false, "2026-09-09")).rejects.toThrow("before an enrollment start date");
    expect(mocks.tx.enrollment.updateMany).not.toHaveBeenCalled();
  });
});
