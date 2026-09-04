"use server";

import type { EnrollmentCreateInput } from "@/actions/enrollments.schema";
import { db } from "@/lib/db";


// ---------- Queries ----------

export async function getEnrollments(params?: {
  studentId?: string;
  classId?: string;
  status?: "ACTIVE" | "ENDED";
  page?: number;
  pageSize?: number;
}) {
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
  return db.enrollment.create({
    data: {
      studentId: data.studentId,
      classId: data.classId,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
    },
  });
}

export async function endEnrollment(id: string) {
  return db.enrollment.update({
    where: { id },
    data: { status: "ENDED", endDate: new Date() },
  });
}
