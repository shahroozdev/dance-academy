import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    adminUser: { findUnique: vi.fn() },
    student: { findMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    class: { findUniqueOrThrow: vi.fn() },
    enrollment: { findMany: vi.fn(), findFirst: vi.fn(), create: vi.fn() },
    classMonthlyFee: { findUnique: vi.fn() },
    monthlyBillingLineItem: { findFirst: vi.fn(), findMany: vi.fn() },
    monthlyStudentBilling: { findUniqueOrThrow: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    payment: { aggregate: vi.fn(), create: vi.fn() },
    studioSettings: { findUnique: vi.fn() },
    notificationLog: { create: vi.fn() },
  };
  return { tx, auth: vi.fn(), sendEmail: vi.fn(), transaction: vi.fn() };
});
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: { ...mocks.tx, $transaction: mocks.transaction } }));
vi.mock("@/actions/email", () => ({
  sendTemplatedEmail: mocks.sendEmail,
  sendAdminOperationalAlert: vi.fn().mockResolvedValue({ sent: true }),
}));

import {
  buildLineItemInputs,
  familyQualifyingSiblingCount,
  getUnfinalizedBillingIds,
  getUnfinalizedClasses,
} from "@/actions/billing-service";
import { createEnrollment } from "@/actions/enrollments";
import { createPayment, createRefund } from "@/actions/payments";
import { sendPaymentReminders } from "@/actions/reminders";
import { serializableTransaction } from "@/actions/transaction";
import { mutationRegistry } from "@/hooks/mutation-registry";
import { queryRegistry } from "@/hooks/query-registry";

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("WHATSAPP_AUTOMATION_ENABLED", "false");
  mocks.auth.mockResolvedValue({ user: { id: "admin" } });
  mocks.tx.adminUser.findUnique.mockResolvedValue({ id: "admin", role: "OWNER", isActive: true });
  mocks.transaction.mockImplementation((work: (tx: typeof mocks.tx) => Promise<unknown>) => work(mocks.tx));
  // Nothing unfinalized by default — individual tests override this to exercise the gate.
  mocks.tx.monthlyBillingLineItem.findMany.mockResolvedValue([]);
});

describe("action access", () => {
  for (const [name, action] of Object.entries({ ...queryRegistry, ...mutationRegistry })) {
    it(`${name} rejects an unauthenticated call before inspecting arguments`, async () => {
      mocks.auth.mockResolvedValue(null);
      await expect((action as () => Promise<unknown>)()).rejects.toThrow("sign in");
      expect(mocks.tx.adminUser.findUnique).not.toHaveBeenCalled();
      expect(mocks.transaction).not.toHaveBeenCalled();
    });
  }
  it("rejects a disabled admin even with a valid session", async () => {
    mocks.tx.adminUser.findUnique.mockResolvedValue({ isActive: false, role: "OWNER" });
    await expect(queryRegistry.getStudents()).rejects.toThrow("access");
  });
  it("keeps owner settings restricted from staff", async () => {
    mocks.tx.adminUser.findUnique.mockResolvedValue({ isActive: true, role: "STAFF" });
    await expect(mutationRegistry.updateStudioSettings({})).rejects.toThrow("owner");
  });
});

describe("historical enrollment billing", () => {
  const month = new Date("2026-09-01");
  const ended = { id: "ended", classId: "class", startDate: new Date("2026-08-01"), endDate: new Date("2026-10-01"), status: "ENDED", class: { id: "class", discountEligible: true } };
  it("retains a class that ended after the billed month, without charging duplicates", async () => {
    mocks.tx.enrollment.findMany.mockImplementation(({ where }: { where: { status?: string } }) =>
      where.status === "ACTIVE" ? [] : [ended, { ...ended, id: "rejoined" }]);
    mocks.tx.classMonthlyFee.findUnique.mockResolvedValue({ id: "fee", monthlyClassFee: 100 });
    const result = await buildLineItemInputs(mocks.tx as unknown as Parameters<typeof buildLineItemInputs>[0], "student", month);
    expect(result).toEqual([{ enrollmentId: "ended", classMonthlyFeeId: "fee", amount: 100, discountEligible: true }]);
  });
  it("excludes an enrollment that ended before the billed month", async () => {
    mocks.tx.enrollment.findMany.mockResolvedValue([{ ...ended, endDate: new Date("2026-08-31") }]);
    expect(await buildLineItemInputs(mocks.tx as unknown as Parameters<typeof buildLineItemInputs>[0], "student", month)).toEqual([]);
  });
  it("counts siblings with an enrollment overlapping that month even if now ended", async () => {
    mocks.tx.student.findMany.mockImplementation(({ include }: { include: { enrollments: unknown } }) => {
      const enrollments = include.enrollments === true ? [ended] : [];
      return [{ enrollments }, { enrollments }];
    });
    expect(await familyQualifyingSiblingCount(mocks.tx as unknown as Parameters<typeof familyQualifyingSiblingCount>[0], "family", month)).toBe(2);
  });
});

describe("seasonal charge-once billing", () => {
  const month = new Date("2026-09-01");
  const seasonal = {
    id: "sEnroll",
    classId: "seasonalClass",
    startDate: new Date("2026-01-01"),
    endDate: null,
    class: { id: "seasonalClass", discountEligible: true, pricingType: "SEASONAL", dayOfWeek: null, standardRate: 45 },
  };
  it("skips a seasonal enrollment already billed in an earlier month", async () => {
    mocks.tx.enrollment.findMany.mockResolvedValue([seasonal]);
    mocks.tx.monthlyBillingLineItem.findFirst.mockResolvedValue({ id: "priorLineItem" });
    const result = await buildLineItemInputs(mocks.tx as unknown as Parameters<typeof buildLineItemInputs>[0], "student", month);
    expect(result).toEqual([]);
    expect(mocks.tx.classMonthlyFee.findUnique).not.toHaveBeenCalled();
  });
  it("bills a seasonal enrollment the first month it overlaps, excluded from either discount", async () => {
    mocks.tx.enrollment.findMany.mockResolvedValue([seasonal]);
    mocks.tx.monthlyBillingLineItem.findFirst.mockResolvedValue(null);
    mocks.tx.classMonthlyFee.findUnique.mockResolvedValue({ id: "seasonFee", monthlyClassFee: 45, rate: null });
    const result = await buildLineItemInputs(mocks.tx as unknown as Parameters<typeof buildLineItemInputs>[0], "student", month);
    expect(result).toEqual([{ enrollmentId: "sEnroll", classMonthlyFeeId: "seasonFee", amount: 45, discountEligible: false }]);
  });
});

describe("billing finalization gate", () => {
  it("lists the distinct classes not yet finalized for the given bills", async () => {
    mocks.tx.monthlyBillingLineItem.findMany.mockResolvedValue([
      { billingId: "b1", classMonthlyFee: { class: { name: "Ballet" } } },
      { billingId: "b2", classMonthlyFee: { class: { name: "Ballet" } } },
      { billingId: "b3", classMonthlyFee: { class: { name: "Tap" } } },
    ]);
    expect(await getUnfinalizedClasses(["b1", "b2", "b3"])).toEqual(["Ballet", "Tap"]);
    expect(await getUnfinalizedBillingIds(["b1", "b2", "b3"])).toEqual(new Set(["b1", "b2", "b3"]));
  });
  it("skips the query entirely for an empty bill list", async () => {
    expect(await getUnfinalizedClasses([])).toEqual([]);
    expect(mocks.tx.monthlyBillingLineItem.findMany).not.toHaveBeenCalled();
  });
});

describe("enrollment creation", () => {
  it("rejects another active enrollment regardless of the new start date", async () => {
    mocks.tx.student.findUniqueOrThrow.mockResolvedValue({ isActive: true });
    mocks.tx.class.findUniqueOrThrow.mockResolvedValue({ isActive: true });
    mocks.tx.enrollment.findFirst.mockResolvedValue({ id: "existing" });
    await expect(createEnrollment({ studentId: "s", classId: "c", startDate: "2026-09-10" })).rejects.toThrow("already enrolled");
    expect(mocks.tx.enrollment.create).not.toHaveBeenCalled();
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), expect.objectContaining({ isolationLevel: "Serializable" }));
  });
  it("retries a serialization conflict", async () => {
    mocks.transaction.mockRejectedValueOnce(Object.assign(new Error("conflict"), { code: "P2034" }));
    expect(await serializableTransaction(async () => "saved")).toBe("saved");
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
  });
});

describe("payments and refunds", () => {
  const input = { billingId: "bill", paymentDate: "2026-09-07", amount: 20, method: "CASH" as const, notes: "Cancelled class" };
  beforeEach(() => {
    mocks.tx.monthlyStudentBilling.findUniqueOrThrow.mockResolvedValue({ id: "bill", finalAmountDue: 80 });
    mocks.tx.payment.aggregate.mockResolvedValue({ _sum: { amount: 100 } });
    mocks.tx.monthlyStudentBilling.update.mockResolvedValue({ id: "bill" });
  });
  it("records returned cash and clears the overpayment", async () => {
    await createRefund(input);
    expect(mocks.tx.payment.create).toHaveBeenCalledWith({ data: expect.objectContaining({ amount: -20, paymentDate: new Date("2026-09-07"), notes: "Refund: Cancelled class" }) });
    expect(mocks.tx.monthlyStudentBilling.update).toHaveBeenCalledWith({ where: { id: "bill" }, data: { amountPaid: 80, balance: 0, status: "PAID" } });
  });
  it("rejects refunds above the credit balance", async () => {
    await expect(createRefund({ ...input, amount: 21 })).rejects.toThrow("exceed");
    expect(mocks.tx.payment.create).not.toHaveBeenCalled();
  });
  it("rejects negative payments and missing refund reasons at the server boundary", async () => {
    await expect(createPayment({ ...input, amount: -20 })).rejects.toThrow();
    await expect(createRefund({ ...input, notes: " " })).rejects.toThrow();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});

describe("payment reminders", () => {
  beforeEach(() => {
    mocks.tx.studioSettings.findUnique.mockResolvedValue(null);
    mocks.tx.monthlyStudentBilling.findMany.mockResolvedValue([{
      id: "bill", month: new Date("2020-01-01"), finalAmountDue: 100, balance: 40,
      student: { familyId: "family", fullName: "Nia", family: { familyName: "Family", parentGuardianName: "Parent", email: "parent@example.test", phone: "5551234567" } },
    }]);
  });
  it("reminds a partially paid family about only its remaining balance", async () => {
    mocks.sendEmail.mockResolvedValue({ sent: true, text: "reminder" });
    await sendPaymentReminders();
    expect(mocks.sendEmail).toHaveBeenCalledWith("PAYMENT_REMINDER", expect.objectContaining({ feeSummary: "Nia – $40.00" }), "parent@example.test");
    expect(mocks.tx.monthlyStudentBilling.updateMany).toHaveBeenCalledOnce();
  });
  it("leaves a failed reminder eligible and records success on the next run", async () => {
    mocks.sendEmail.mockResolvedValueOnce({ sent: false, error: "SMTP unavailable", text: "reminder" }).mockResolvedValueOnce({ sent: true, text: "reminder" });
    expect((await sendPaymentReminders()).familiesFailed).toBe(1);
    expect(mocks.tx.monthlyStudentBilling.updateMany).not.toHaveBeenCalled();
    expect((await sendPaymentReminders()).familiesReminded).toBe(1);
    expect(mocks.tx.monthlyStudentBilling.updateMany).toHaveBeenCalledOnce();
  });
  it("silently skips a bill whose class fee isn't finalized yet, on the scheduled bulk run", async () => {
    mocks.tx.monthlyBillingLineItem.findMany.mockResolvedValue([
      { billingId: "bill", classMonthlyFee: { class: { name: "Ballet" } } },
    ]);
    const summary = await sendPaymentReminders();
    expect(summary.familiesReminded).toBe(0);
    expect(summary.familiesFailed).toBe(0);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
  it("blocks a manual family retry when its class fee isn't finalized yet", async () => {
    mocks.tx.monthlyBillingLineItem.findMany.mockResolvedValue([
      { billingId: "bill", classMonthlyFee: { class: { name: "Ballet" } } },
    ]);
    await expect(sendPaymentReminders({ familyId: "family", month: new Date("2020-01-01") })).rejects.toThrow("Finalize");
  });
});
