"use server";

import { requireAdmin } from "@/actions/access";
import { recalculateBilling } from "@/actions/billing";
import { recalculateEnrollmentRangeBills } from "@/actions/billing-impact";
import { enrollmentBillingPauseSchema, enrollmentCreateSchema, enrollmentStartDateUpdateSchema } from "@/actions/enrollments.schema";
import type { EnrollmentBillingPauseInput, EnrollmentCreateInput, EnrollmentStartDateUpdateInput } from "@/actions/enrollments.schema";
import { serializableTransaction } from "@/actions/transaction";
import { idSchema , validateListQuery } from "@/actions/validation.schema";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { enrollmentCalendarDate } from "@/lib/enrollment-date";


// ---------- Queries ----------

export async function getEnrollments(params?: {
  studentId?: string;
  classId?: string;
  status?: "ACTIVE" | "ENDED";
  page?: number;
  pageSize?: number;
}) {
  await requireAdmin();
  validateListQuery(params, []);
  const { studentId, classId, status, page = 1, pageSize = 50 } = params ?? {};

  const where: Record<string, unknown> = {};
  if (studentId) where.studentId = studentId;
  if (classId) where.classId = classId;
  if (status) where.status = status;

  const [data, total] = await Promise.all([
    db.enrollment.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true } },
        class: { select: { id: true, name: true, dayOfWeek: true, startTime: true } },
        billingPauses: { orderBy: { startMonth: "desc" } },
      },
      orderBy: { startDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.enrollment.count({ where }),
  ]);

  return { data, total, pages: Math.ceil(total / pageSize) };
}

// ---------- Mutations ----------

export async function createEnrollment(data: EnrollmentCreateInput) {
  await requireAdmin();
  data = enrollmentCreateSchema.parse(data);
  const startDate = parseEnrollmentStartDate(data.startDate);
  const enrollment = await serializableTransaction(async (tx) => {
    const student = await tx.student.findUniqueOrThrow({ where: { id: data.studentId } });
    const cls = await tx.class.findUniqueOrThrow({ where: { id: data.classId } });
    if (!student.isActive || !cls.isActive) throw new Error("Select an active student and class.");
    assertNotBeforeClassStart(startDate, cls.firstClassDate);
    await assertNoOverlappingEnrollment(tx, { studentId: data.studentId, classId: data.classId, startDate });
    return tx.enrollment.create({
      data: { studentId: data.studentId, classId: data.classId, startDate },
    });
  });
  await recalculateEnrollmentRangeBills(
    enrollment.id,
    undefined,
    undefined,
    "A new enrollment affects this family bill after payment was recorded. Review the bill and add an adjustment if needed.",
  );
  return enrollment;
}

export async function endEnrollment(id: string, endDateInput: string) {
  await requireAdmin();
  id = idSchema.parse(id);
  const { startDate: endDateValue } = enrollmentStartDateUpdateSchema.parse({ startDate: endDateInput });
  const endDate = new Date(`${endDateValue}T00:00:00.000Z`);
  const current = await db.enrollment.findUniqueOrThrow({ where: { id }, select: { startDate: true } });
  if (endDate < enrollmentCalendarDate(current.startDate)) {
    throw new Error("The last class date cannot be before the enrollment's first billable date.");
  }
  const enrollment = await db.enrollment.update({
    where: { id, status: "ACTIVE" },
    data: { status: "ENDED", endDate },
  });
  await recalculateEnrollmentRangeBills(
    id,
    undefined,
    undefined,
    "An enrollment was ended after payment was recorded. Review the bill and add an adjustment if needed.",
  );
  return enrollment;
}

export async function updateEnrollmentStartDate(id: string, data: EnrollmentStartDateUpdateInput) {
  await requireAdmin();
  id = idSchema.parse(id);
  data = enrollmentStartDateUpdateSchema.parse(data);
  const startDate = parseEnrollmentStartDate(data.startDate);

  const enrollment = await db.enrollment.findUniqueOrThrow({
    where: { id },
    select: { studentId: true, classId: true, endDate: true, class: { select: { firstClassDate: true } } },
  });
  assertNotBeforeClassStart(startDate, enrollment.class.firstClassDate);
  if (enrollment.endDate && startDate > enrollmentCalendarDate(enrollment.endDate)) {
    throw new Error("Enrollment start date cannot be after its end date.");
  }
  // Moving a period's start must not make it cover dates another period of the same class already covers.
  await assertNoOverlappingEnrollment(db, {
    studentId: enrollment.studentId,
    classId: enrollment.classId,
    startDate,
    endDate: enrollment.endDate,
    excludeId: id,
  });

  const updated = await db.enrollment.update({ where: { id }, data: { startDate } });
  await recalculateEnrollmentRangeBills(
    id,
    undefined,
    undefined,
    "The enrollment start date changed after payment was recorded. Review the bill and add an adjustment if needed.",
  );
  return updated;
}

function parseEnrollmentStartDate(value?: string) {
  return value ? new Date(value) : new Date();
}

// One student may hold several periods in the same class (leaving and rejoining), but the periods
// must not overlap: overlapping rows would describe the same sessions twice.
async function assertNoOverlappingEnrollment(
  tx: Prisma.TransactionClient,
  { studentId, classId, startDate, endDate = null, excludeId }: {
    studentId: string;
    classId: string;
    startDate: Date;
    endDate?: Date | null;
    excludeId?: string;
  },
) {
  const overlapping = await tx.enrollment.findFirst({
    where: {
      studentId,
      classId,
      ...(excludeId && { id: { not: excludeId } }),
      ...(endDate && { startDate: { lte: endDate } }),
      OR: [{ endDate: null }, { endDate: { gte: startDate } }],
    },
    select: { endDate: true },
  });
  if (!overlapping) return;
  if (!overlapping.endDate) throw new Error("This student is already enrolled in this class.");
  throw new Error(
    `This student's earlier enrollment in this class ran until ${overlapping.endDate.toISOString().slice(0, 10)}. Choose a first billable date after that.`,
  );
}

function assertNotBeforeClassStart(enrollmentStart: Date, firstClassDate: Date) {
  if (enrollmentStart < enrollmentCalendarDate(firstClassDate)) {
    throw new Error("The first billable date cannot be before the class's first class date.");
  }
}

// Re-enrolling starts a new enrollment period and keeps the ended one unchanged. Rewriting the
// ended row's dates would erase the months it covered, dropping the class from those older bills
// the next time they are recalculated.
export async function reactivateEnrollment(id: string, firstBillableDate: string) {
  await requireAdmin();
  id = idSchema.parse(id);
  const { startDate } = enrollmentStartDateUpdateSchema.parse({ startDate: firstBillableDate });
  const enrollment = await serializableTransaction(async (tx) => {
    const enrollment = await tx.enrollment.findUniqueOrThrow({ where: { id } });
    if (enrollment.status !== "ENDED") throw new Error("Only an ended enrollment can be re-enrolled.");

    const [student, cls] = await Promise.all([
      tx.student.findUniqueOrThrow({ where: { id: enrollment.studentId } }),
      tx.class.findUniqueOrThrow({ where: { id: enrollment.classId } }),
    ]);
    if (!student.isActive || !cls.isActive) throw new Error("Both the student and class must be active to re-enroll.");
    const start = new Date(`${startDate}T00:00:00.000Z`);
    assertNotBeforeClassStart(start, cls.firstClassDate);
    await assertNoOverlappingEnrollment(tx, { studentId: enrollment.studentId, classId: enrollment.classId, startDate: start });

    return tx.enrollment.create({
      data: { studentId: enrollment.studentId, classId: enrollment.classId, startDate: start },
    });
  });
  await recalculateEnrollmentRangeBills(
    enrollment.id,
    undefined,
    undefined,
    "A reactivated enrollment affects this family bill after payment was recorded. Review the bill and add an adjustment if needed.",
  );
  return enrollment;
}

export async function createEnrollmentBillingPause(id: string, input: EnrollmentBillingPauseInput) {
  await requireAdmin();
  id = idSchema.parse(id);
  input = enrollmentBillingPauseSchema.parse(input);
  const startMonth = new Date(`${input.startMonth}-01T00:00:00.000Z`);
  const endMonth = new Date(`${input.endMonth}-01T00:00:00.000Z`);

  const overlap = await db.enrollmentBillingPause.findFirst({
    where: { enrollmentId: id, startMonth: { lte: endMonth }, endMonth: { gte: startMonth } },
  });
  if (overlap) throw new Error("This enrollment already has a billing pause covering part of that period.");

  const pause = await db.enrollmentBillingPause.create({
    data: { enrollmentId: id, startMonth, endMonth, reason: input.reason || null },
  });
  await recalculateEnrollmentRangeBills(
    id,
    startMonth,
    endMonth,
    "A student billing pause was added after payment was recorded. Review the bill and add an adjustment if needed.",
  );
  return pause;
}

export async function deleteEnrollmentBillingPause(id: string) {
  await requireAdmin();
  id = idSchema.parse(id);
  const pause = await db.enrollmentBillingPause.delete({ where: { id } });
  await recalculateEnrollmentRangeBills(
    pause.enrollmentId,
    pause.startMonth,
    pause.endMonth,
    "A student billing pause was removed after payment was recorded. Review the bill and add an adjustment if needed.",
  );
  return pause;
}

export async function deleteEnrollment(id: string) {
  await requireAdmin();
  id = idSchema.parse(id);
  const billingIds = await serializableTransaction(async (tx) => {
    const enrollment = await tx.enrollment.findUniqueOrThrow({
      where: { id },
      include: { student: { select: { familyId: true } } },
    });
    const lineItems = await tx.monthlyBillingLineItem.findMany({
      where: { enrollmentId: enrollment.id },
      select: { billing: { select: { id: true, month: true, payments: { select: { id: true } } } } },
    });
    if (lineItems.some((line) => line.billing.payments.length > 0)) {
      throw new Error("This enrollment is connected to a bill with a payment. End the enrollment and use a bill adjustment instead.");
    }
    const affectedMonths = [...new Map(lineItems.map((line) => [line.billing.month.getTime(), line.billing.month])).values()];
    await tx.monthlyBillingLineItem.deleteMany({ where: { enrollmentId: enrollment.id } });
    await tx.enrollment.delete({ where: { id: enrollment.id } });
    if (affectedMonths.length === 0) return [];
    const familyBills = await tx.monthlyStudentBilling.findMany({
      where: {
        month: { in: affectedMonths },
        student: { familyId: enrollment.student.familyId },
        payments: { none: {} },
      },
      select: { id: true },
    });
    return familyBills.map((bill) => bill.id);
  });
  for (const billingId of billingIds) await recalculateBilling(billingId);
  return { deleted: true, recalculatedBills: billingIds.length };
}
