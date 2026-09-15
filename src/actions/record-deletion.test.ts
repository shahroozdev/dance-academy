import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { deleteStudentRecords } from "@/actions/record-deletion";
import type { Prisma } from "@/generated/prisma/client";

function createTransaction() {
  return {
    monthlyStudentBilling: {
      findMany: vi.fn().mockResolvedValue([{ id: "bill-1" }, { id: "bill-2" }]),
      deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
    },
    payment: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
    registrationRequest: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
    enrollment: { deleteMany: vi.fn().mockResolvedValue({ count: 3 }) },
    student: { deleteMany: vi.fn().mockResolvedValue({ count: 2 }) },
  };
}

describe("deleteStudentRecords", () => {
  beforeEach(() => vi.clearAllMocks());

  it("removes dependent financial and enrollment records before students", async () => {
    const tx = createTransaction();
    const calls: string[] = [];
    tx.payment.deleteMany.mockImplementation(async () => {
      calls.push("payments");
      return { count: 1 };
    });
    tx.monthlyStudentBilling.deleteMany.mockImplementation(async () => {
      calls.push("billings");
      return { count: 2 };
    });
    tx.registrationRequest.deleteMany.mockImplementation(async () => {
      calls.push("registrations");
      return { count: 2 };
    });
    tx.enrollment.deleteMany.mockImplementation(async () => {
      calls.push("enrollments");
      return { count: 3 };
    });
    tx.student.deleteMany.mockImplementation(async () => {
      calls.push("students");
      return { count: 2 };
    });

    await deleteStudentRecords(tx as unknown as Prisma.TransactionClient, ["student-1", "student-2"]);

    expect(tx.monthlyStudentBilling.findMany).toHaveBeenCalledWith({
      where: { studentId: { in: ["student-1", "student-2"] } },
      select: { id: true },
    });
    expect(tx.payment.deleteMany).toHaveBeenCalledWith({
      where: { billingId: { in: ["bill-1", "bill-2"] } },
    });
    expect(calls).toEqual(["payments", "billings", "registrations", "enrollments", "students"]);
  });

  it("does nothing when there are no students", async () => {
    const tx = createTransaction();

    await deleteStudentRecords(tx as unknown as Prisma.TransactionClient, []);

    expect(tx.monthlyStudentBilling.findMany).not.toHaveBeenCalled();
  });
});
