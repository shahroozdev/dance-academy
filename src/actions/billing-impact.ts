import "server-only";

import { recalculateBilling } from "@/actions/billing";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export type BillingImpactSummary = {
  recalculated: number;
  skippedWithPayments: number;
};

export async function recalculateAffectedBills(
  where: Prisma.MonthlyStudentBillingWhereInput,
): Promise<BillingImpactSummary> {
  const bills = await db.monthlyStudentBilling.findMany({
    where,
    select: { id: true, payments: { select: { id: true } } },
  });
  const uniqueBills = [...new Map(bills.map((bill) => [bill.id, bill])).values()];
  let recalculated = 0;
  let skippedWithPayments = 0;

  for (const bill of uniqueBills) {
    if (bill.payments.length > 0) {
      skippedWithPayments++;
      continue;
    }
    try {
      await recalculateBilling(bill.id);
      recalculated++;
    } catch (error) {
      if (error instanceof Error && error.message.includes("has payments recorded")) {
        skippedWithPayments++;
        continue;
      }
      throw error;
    }
  }

  return { recalculated, skippedWithPayments };
}

export async function recalculateClassMonthBills(
  classId: string,
  month: Date,
  includeFamilyBills: boolean,
): Promise<BillingImpactSummary> {
  const enrollments = await db.enrollment.findMany({
    where: { classId },
    select: { studentId: true, student: { select: { familyId: true } } },
  });
  const studentIds = [...new Set(enrollments.map((enrollment) => enrollment.studentId))];
  const familyIds = [...new Set(enrollments.map((enrollment) => enrollment.student.familyId))];
  const studentWhere = includeFamilyBills
    ? { familyId: { in: familyIds } }
    : { id: { in: studentIds } };

  if (studentIds.length === 0) return { recalculated: 0, skippedWithPayments: 0 };
  return recalculateAffectedBills({ month, student: studentWhere });
}

export async function recalculateClassRangeBills(
  classId: string,
  startMonth: Date,
  endMonth: Date,
): Promise<BillingImpactSummary> {
  const monthAfterEnd = new Date(Date.UTC(endMonth.getUTCFullYear(), endMonth.getUTCMonth() + 1, 1));
  const enrollments = await db.enrollment.findMany({
    where: { classId },
    select: { student: { select: { familyId: true } } },
  });
  const familyIds = [...new Set(enrollments.map((enrollment) => enrollment.student.familyId))];
  if (familyIds.length === 0) return { recalculated: 0, skippedWithPayments: 0 };
  return recalculateAffectedBills({
    month: { gte: startMonth, lt: monthAfterEnd },
    student: { familyId: { in: familyIds } },
  });
}

export async function recalculateAllClassFamilyBills(classId: string): Promise<BillingImpactSummary> {
  const enrollments = await db.enrollment.findMany({
    where: { classId },
    select: { student: { select: { familyId: true } } },
  });
  const familyIds = [...new Set(enrollments.map((enrollment) => enrollment.student.familyId))];
  if (familyIds.length === 0) return { recalculated: 0, skippedWithPayments: 0 };
  return recalculateAffectedBills({ student: { familyId: { in: familyIds } } });
}

export async function recalculateEnrollmentRangeBills(
  enrollmentId: string,
  startMonth?: Date,
  endMonth?: Date,
): Promise<BillingImpactSummary> {
  const enrollment = await db.enrollment.findUniqueOrThrow({
    where: { id: enrollmentId },
    select: { student: { select: { familyId: true } } },
  });
  const month = startMonth && endMonth
    ? {
        gte: startMonth,
        lt: new Date(Date.UTC(endMonth.getUTCFullYear(), endMonth.getUTCMonth() + 1, 1)),
      }
    : undefined;
  return recalculateAffectedBills({
    ...(month && { month }),
    student: { familyId: enrollment.student.familyId },
  });
}
