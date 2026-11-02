import { beforeEach, describe, expect, it, vi } from "vitest";

// Regression coverage for the 2026-10-15 billing/enrollment audit. Each block names the defect
// it guards against.
const mocks = vi.hoisted(() => {
  const tx = {
    student: { findMany: vi.fn(), findUniqueOrThrow: vi.fn(), count: vi.fn() },
    class: { findUniqueOrThrow: vi.fn() },
    enrollment: { findMany: vi.fn(), findFirst: vi.fn(), findUniqueOrThrow: vi.fn(), create: vi.fn(), update: vi.fn() },
    classMonthlyFee: { findUnique: vi.fn() },
    classExtraSession: { findMany: vi.fn() },
    monthlyBillingLineItem: { findFirst: vi.fn(), deleteMany: vi.fn(), createMany: vi.fn() },
    monthlyStudentBilling: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), upsert: vi.fn(), aggregate: vi.fn(), count: vi.fn() },
    payment: { aggregate: vi.fn(), update: vi.fn(), create: vi.fn() },
    studioSettings: { findUnique: vi.fn() },
  };
  return { tx, transaction: vi.fn(), recalculateEnrollmentRangeBills: vi.fn() };
});
vi.mock("@/lib/db", () => ({ db: { ...mocks.tx, $transaction: mocks.transaction } }));
vi.mock("@/actions/access", () => ({ requireAdmin: vi.fn().mockResolvedValue({ id: "admin" }) }));
vi.mock("@/actions/email", () => ({ sendAdminOperationalAlert: vi.fn() }));
vi.mock("@/actions/billing-impact", () => ({ recalculateEnrollmentRangeBills: mocks.recalculateEnrollmentRangeBills }));

import { recalculateBilling } from "@/actions/billing";
import { buildLineItemInputs, familyQualifyingSiblingCount, generateMonthlyBilling } from "@/actions/billing-service";
import { getDashboardSummary } from "@/actions/dashboard";
import { createEnrollment, endEnrollment, reactivateEnrollment, updateEnrollmentStartDate } from "@/actions/enrollments";

type Tx = Parameters<typeof buildLineItemInputs>[0];
const tx = mocks.tx as unknown as Tx;
const day = (value: string) => new Date(`${value}T00:00:00.000Z`);
const october = day("2026-10-01");
const thursdayClass = {
  id: "class",
  firstClassDate: day("2026-09-01"),
  inactiveFromMonth: null,
  lastClassDate: null,
  pricingType: "REGULAR",
  dayOfWeek: "THURSDAY",
  standardRate: 20,
  discountEligible: true,
  billingPauses: [],
};
const period = (id: string, startDate: string, endDate: string | null, cls: object = thursdayClass) => ({
  id,
  classId: (cls as { id: string }).id,
  startDate: day(startDate),
  endDate: endDate ? day(endDate) : null,
  billingPauses: [],
  class: cls,
});

beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation((work: (client: typeof mocks.tx) => Promise<unknown>) => work(mocks.tx));
  mocks.tx.classExtraSession.findMany.mockResolvedValue([]);
  mocks.tx.studioSettings.findUnique.mockResolvedValue(null);
});

describe("re-enrollment within one month", () => {
  it("charges the class once for the sessions of both periods instead of only the first", async () => {
    mocks.tx.enrollment.findMany.mockResolvedValue([period("first", "2026-09-01", "2026-10-08"), period("rejoined", "2026-10-22", null)]);
    mocks.tx.classMonthlyFee.findUnique.mockResolvedValue({ id: "fee", monthlyClassFee: 100, rate: 20 });

    expect(await buildLineItemInputs(tx, "student", october)).toEqual([
      { classId: "class", enrollmentId: "first", classMonthlyFeeId: "fee", amount: 80, discountEligible: true },
    ]);
  });

  it("charges rehearsals only on dates inside one of the student's enrollment periods", async () => {
    mocks.tx.enrollment.findMany.mockResolvedValue([period("first", "2026-09-01", "2026-10-08"), period("rejoined", "2026-10-22", null)]);
    mocks.tx.classMonthlyFee.findUnique.mockResolvedValue({ id: "fee", monthlyClassFee: 100, rate: 20 });

    await buildLineItemInputs(tx, "student", october);
    expect(mocks.tx.classExtraSession.findMany).toHaveBeenCalledWith({
      where: {
        classId: "class",
        OR: [
          { sessionDate: { gte: october, lt: day("2026-11-01"), lte: day("2026-10-08") } },
          { sessionDate: { gte: day("2026-10-22"), lt: day("2026-11-01") } },
        ],
      },
      select: { amount: true },
    });
  });

  it("charges a seasonal fee once per student and class, even across two enrollment rows", async () => {
    const seasonal = { ...thursdayClass, id: "onam", pricingType: "SEASONAL", dayOfWeek: null };
    mocks.tx.enrollment.findMany.mockResolvedValue([period("old", "2026-09-18", "2026-09-30", seasonal), period("new", "2026-10-03", null, seasonal)]);
    mocks.tx.classMonthlyFee.findUnique.mockResolvedValue({ id: "onamFee", monthlyClassFee: 160, rate: null });
    mocks.tx.monthlyBillingLineItem.findFirst.mockResolvedValue({ id: "chargedInSeptember" });

    expect(await buildLineItemInputs(tx, "student", october)).toEqual([]);
    expect(mocks.tx.monthlyBillingLineItem.findFirst).toHaveBeenCalledWith({
      where: { classMonthlyFee: { classId: "onam" }, billing: { studentId: "student", month: { not: october } } },
    });
  });
});

describe("class last class date within a part month", () => {
  it("does not charge sessions after the class ended", async () => {
    const endedClass = { ...thursdayClass, lastClassDate: day("2026-10-09"), inactiveFromMonth: day("2026-11-01") };
    mocks.tx.enrollment.findMany.mockResolvedValue([period("late", "2026-10-05", null, endedClass)]);
    mocks.tx.classMonthlyFee.findUnique.mockResolvedValue({ id: "fee", monthlyClassFee: 40, rate: 20 });

    expect(await buildLineItemInputs(tx, "student", october)).toEqual([
      { classId: "class", enrollmentId: "late", classMonthlyFeeId: "fee", amount: 20, discountEligible: true },
    ]);
  });
});

describe("sibling discount for past months", () => {
  it("still counts a since-deactivated sibling for months they attended, but not an inactive open enrollment", async () => {
    mocks.tx.student.findMany.mockResolvedValue([
      { isActive: true, enrollments: [period("a", "2026-09-01", null)] },
      { isActive: false, enrollments: [period("b", "2026-09-01", "2026-10-20")] },
      { isActive: false, enrollments: [period("c", "2026-09-01", null)] },
    ]);
    expect(await familyQualifyingSiblingCount(tx, "family", october)).toBe(2);
    expect(mocks.tx.student.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { familyId: "family" } }));
  });
});

describe("payment class allocation after recalculation", () => {
  it("keeps the payment but flags the bill when its class is no longer charged", async () => {
    mocks.tx.monthlyStudentBilling.findUniqueOrThrow.mockResolvedValue({ studentId: "student", month: october, student: { familyId: "family" } });
    mocks.tx.monthlyStudentBilling.findUnique.mockResolvedValue({
      id: "bill",
      adjustment: 0,
      payments: [{ amount: 160, classId: "onam", class: { name: "Onam Dance 2026 SJ" } }],
    });
    mocks.tx.enrollment.findMany.mockResolvedValue([period("regular", "2026-09-01", null)]);
    mocks.tx.classMonthlyFee.findUnique.mockResolvedValue({ id: "fee", monthlyClassFee: 100, rate: 20 });
    mocks.tx.student.findMany.mockResolvedValue([]);
    mocks.tx.monthlyStudentBilling.upsert.mockResolvedValue({ id: "bill" });

    await recalculateBilling("bill");

    expect(mocks.tx.monthlyStudentBilling.upsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({
        finalAmountDue: 100,
        amountPaid: 160,
        balance: -60,
        status: "OVERPAID",
        needsManualReview: true,
        manualReviewReason: expect.stringContaining("Onam Dance 2026 SJ"),
      }),
    }));
    expect(mocks.tx.payment.update).not.toHaveBeenCalled();
  });
});

describe("monthly generation", () => {
  it("does not create an empty $0 bill when a student has nothing to charge that month", async () => {
    const seasonal = { ...thursdayClass, id: "onam", pricingType: "SEASONAL", dayOfWeek: null };
    mocks.tx.student.findMany.mockResolvedValue([{
      id: "student",
      fullName: "Student",
      familyId: "family",
      enrollments: [period("onam", "2026-09-18", null, seasonal)],
      monthlyBillings: [],
    }]);
    mocks.tx.monthlyStudentBilling.findUnique.mockResolvedValue(null);
    mocks.tx.enrollment.findMany.mockResolvedValue([period("onam", "2026-09-18", null, seasonal)]);
    mocks.tx.classMonthlyFee.findUnique.mockResolvedValue({ id: "onamFee", monthlyClassFee: 160, rate: null });
    mocks.tx.monthlyBillingLineItem.findFirst.mockResolvedValue({ id: "chargedInSeptember" });

    await expect(generateMonthlyBilling("2026-10")).resolves.toMatchObject({ created: 0, skipped: 1 });
    expect(mocks.tx.monthlyStudentBilling.upsert).not.toHaveBeenCalled();
  });
});

describe("enrollment periods", () => {
  beforeEach(() => {
    mocks.tx.student.findUniqueOrThrow.mockResolvedValue({ isActive: true });
    mocks.tx.class.findUniqueOrThrow.mockResolvedValue({ isActive: true, firstClassDate: day("2026-09-01") });
    mocks.recalculateEnrollmentRangeBills.mockResolvedValue({ recalculated: 0, skippedWithPayments: 0 });
  });

  it("re-enrolls as a new period and leaves the ended period's dates unchanged", async () => {
    mocks.tx.enrollment.findUniqueOrThrow.mockResolvedValue({ id: "ended", studentId: "s", classId: "c", status: "ENDED", endDate: day("2026-09-24") });
    mocks.tx.enrollment.findFirst.mockResolvedValue(null);
    mocks.tx.enrollment.create.mockResolvedValue({ id: "new" });

    await reactivateEnrollment("ended", "2026-10-08");

    expect(mocks.tx.enrollment.update).not.toHaveBeenCalled();
    expect(mocks.tx.enrollment.create).toHaveBeenCalledWith({ data: { studentId: "s", classId: "c", startDate: day("2026-10-08") } });
    expect(mocks.recalculateEnrollmentRangeBills).toHaveBeenCalledWith("new", undefined, undefined, expect.any(String));
  });

  it("rejects a new enrollment that starts inside an earlier period of the same class", async () => {
    mocks.tx.enrollment.findFirst.mockResolvedValue({ endDate: day("2026-09-24") });

    await expect(createEnrollment({ studentId: "s", classId: "c", startDate: "2026-09-17" })).rejects.toThrow("ran until 2026-09-24");
    expect(mocks.tx.enrollment.create).not.toHaveBeenCalled();
  });

  it("rejects moving a re-enrollment's start date back into the earlier period", async () => {
    mocks.tx.enrollment.findUniqueOrThrow.mockResolvedValue({ studentId: "s", classId: "c", endDate: null, class: { firstClassDate: day("2026-09-01") } });
    mocks.tx.enrollment.findFirst.mockResolvedValue({ endDate: day("2026-09-24") });

    await expect(updateEnrollmentStartDate("new", { startDate: "2026-09-17" })).rejects.toThrow("ran until 2026-09-24");
    expect(mocks.tx.enrollment.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: { not: "new" } }),
    }));
    expect(mocks.tx.enrollment.update).not.toHaveBeenCalled();
  });

  it("rejects ending an enrollment before its first billable date", async () => {
    mocks.tx.enrollment.findUniqueOrThrow.mockResolvedValue({ startDate: day("2026-09-10") });

    await expect(endEnrollment("e", "2026-09-03")).rejects.toThrow("cannot be before");
    expect(mocks.tx.enrollment.update).not.toHaveBeenCalled();
  });
});

describe("dashboard outstanding", () => {
  it("sums only balances still owed, so a family's credit does not reduce what others owe", async () => {
    mocks.tx.monthlyStudentBilling.aggregate.mockResolvedValue({ _sum: { finalAmountDue: 300, balance: 180 } });
    mocks.tx.payment.aggregate.mockResolvedValue({ _sum: { amount: 0 } });

    await getDashboardSummary();

    expect(mocks.tx.monthlyStudentBilling.aggregate).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ balance: { gt: 0 } }),
      _sum: { balance: true },
    }));
  });
});
