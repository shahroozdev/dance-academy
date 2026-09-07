"use server";

import { requireAdmin } from "@/actions/access";
import { enrollmentCreateSchema } from "@/actions/enrollments.schema";
import type { EnrollmentCreateInput } from "@/actions/enrollments.schema";
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
  return serializableTransaction(async (tx) => {
    const student = await tx.student.findUniqueOrThrow({ where: { id: data.studentId } });
    const cls = await tx.class.findUniqueOrThrow({ where: { id: data.classId } });
    if (!student.isActive || !cls.isActive) throw new Error("Select an active student and class.");
    const existing = await tx.enrollment.findFirst({
      where: { studentId: data.studentId, classId: data.classId, status: "ACTIVE" },
    });
    if (existing) throw new Error("This student is already enrolled in this class.");
    return tx.enrollment.create({
      data: { studentId: data.studentId, classId: data.classId, startDate: data.startDate ? new Date(data.startDate) : new Date() },
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
