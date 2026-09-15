"use server";

import { requireAdmin } from "@/actions/access";
import { enrollmentCreateSchema, enrollmentStartDateUpdateSchema } from "@/actions/enrollments.schema";
import type { EnrollmentCreateInput, EnrollmentStartDateUpdateInput } from "@/actions/enrollments.schema";
import { serializableTransaction } from "@/actions/transaction";
import { idSchema , validateListQuery } from "@/actions/validation.schema";
import { db } from "@/lib/db";


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
  return serializableTransaction(async (tx) => {
    const student = await tx.student.findUniqueOrThrow({ where: { id: data.studentId } });
    const cls = await tx.class.findUniqueOrThrow({ where: { id: data.classId } });
    if (!student.isActive || !cls.isActive) throw new Error("Select an active student and class.");
    const existing = await tx.enrollment.findFirst({
      where: { studentId: data.studentId, classId: data.classId, status: "ACTIVE" },
    });
    if (existing) throw new Error("This student is already enrolled in this class.");
    return tx.enrollment.create({
      data: { studentId: data.studentId, classId: data.classId, startDate },
    });
  });
}

export async function endEnrollment(id: string) {
  await requireAdmin();
  id = idSchema.parse(id);
  return db.enrollment.update({
    where: { id, status: "ACTIVE" },
    data: { status: "ENDED", endDate: new Date() },
  });
}

export async function updateEnrollmentStartDate(id: string, data: EnrollmentStartDateUpdateInput) {
  await requireAdmin();
  id = idSchema.parse(id);
  data = enrollmentStartDateUpdateSchema.parse(data);
  const startDate = parseEnrollmentStartDate(data.startDate);

  const enrollment = await db.enrollment.findUniqueOrThrow({ where: { id }, select: { endDate: true } });
  if (enrollment.endDate && startDate > enrollment.endDate) {
    throw new Error("Enrollment start date cannot be after its end date.");
  }

  return db.enrollment.update({ where: { id }, data: { startDate } });
}

function parseEnrollmentStartDate(value?: string) {
  const startDate = value ? new Date(value) : new Date();
  const today = new Date();
  today.setUTCHours(23, 59, 59, 999);
  if (startDate > today) throw new Error("Enrollment start date cannot be in the future.");
  return startDate;
}

// Reactivates the same enrollment record (rather than creating a new one) so a student's
// enrollment in a given class stays a single row across an end/re-enroll cycle.
export async function reactivateEnrollment(id: string) {
  await requireAdmin();
  id = idSchema.parse(id);
  return serializableTransaction(async (tx) => {
    const enrollment = await tx.enrollment.findUniqueOrThrow({ where: { id } });
    if (enrollment.status !== "ENDED") throw new Error("Only an ended enrollment can be re-enrolled.");

    const [student, cls] = await Promise.all([
      tx.student.findUniqueOrThrow({ where: { id: enrollment.studentId } }),
      tx.class.findUniqueOrThrow({ where: { id: enrollment.classId } }),
    ]);
    if (!student.isActive || !cls.isActive) throw new Error("Both the student and class must be active to re-enroll.");

    const existingActive = await tx.enrollment.findFirst({
      where: { studentId: enrollment.studentId, classId: enrollment.classId, status: "ACTIVE" },
    });
    if (existingActive) throw new Error("This student is already enrolled in this class.");

    return tx.enrollment.update({
      where: { id },
      data: { status: "ACTIVE", startDate: new Date(), endDate: null },
    });
  });
}
