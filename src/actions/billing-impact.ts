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
  reviewReason = "A billing-related change could not be applied automatically because this bill has payments.",
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
      await db.monthlyStudentBilling.update({
        where: { id: bill.id },
        data: { needsManualReview: true, manualReviewReason: reviewReason, manualReviewAt: new Date() },
      });
      skippedWithPayments++;
      continue;
    }
    try {
      await recalculateBilling(bill.id);
      recalculated++;
    } catch (error) {
      if (error instanceof Error && error.message.includes("has payments recorded")) {
        await db.monthlyStudentBilling.update({
          where: { id: bill.id },
          data: { needsManualReview: true, manualReviewReason: reviewReason, manualReviewAt: new Date() },
        });
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
  reviewReason?: string,
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
  return recalculateAffectedBills({ month, student: studentWhere }, reviewReason);
}

export async function recalculateClassRangeBills(
  classId: string,
  startMonth: Date,
  endMonth: Date,
  reviewReason?: string,
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
  }, reviewReason);
}

export async function recalculateAllClassFamilyBills(
  classId: string,
  reviewReason?: string,
): Promise<BillingImpactSummary> {
  const enrollments = await db.enrollment.findMany({
    where: { classId },
    select: { student: { select: { familyId: true } } },
  });
  const familyIds = [...new Set(enrollments.map((enrollment) => enrollment.student.familyId))];
  if (familyIds.length === 0) return { recalculated: 0, skippedWithPayments: 0 };
  return recalculateAffectedBills({ student: { familyId: { in: familyIds } } }, reviewReason);
}

export async function recalculateEnrollmentRangeBills(
  enrollmentId: string,
  startMonth?: Date,
  endMonth?: Date,
  reviewReason?: string,
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
  }, reviewReason);
}
