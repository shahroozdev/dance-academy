"use server";

import { requireAdmin } from "@/actions/access";
import { teacherCreateSchema, teacherUpdateSchema } from "@/actions/teachers.schema";
import type { TeacherCreateInput, TeacherUpdateInput } from "@/actions/teachers.schema";
import { idSchema, booleanSchema , validateListQuery } from "@/actions/validation.schema";
import type { Prisma } from "@/generated/prisma/client";
import { round2 } from "@/lib/billing";
import { db } from "@/lib/db";
import type { PublicInstructor } from "@/types/instructors";

// ---------- Queries ----------

export type TeacherListItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  classCount: number;
  createdAt: Date;
};

export async function getTeachers(params?: {
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}): Promise<{ data: TeacherListItem[]; total: number; pages: number }> {
  await requireAdmin();
  validateListQuery(params, ["name","email","phone","isActive","createdAt"]);
  const { search, isActive, page = 1, pageSize = 20, sortBy = "name", sortOrder = "asc" } = params ?? {};

  const where: Prisma.TeacherWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
    ];
  }
  if (isActive !== undefined) where.isActive = isActive;

  const [data, total] = await Promise.all([
    db.teacher.findMany({
      where,
      include: { classes: { where: { isActive: true }, select: { id: true } } },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.teacher.count({ where }),
  ]);

  return {
    data: data.map((t) => ({
      id: t.id,
      name: t.name,
      email: t.email,
      phone: t.phone,
      isActive: t.isActive,
      classCount: t.classes.length,
      createdAt: t.createdAt,
    })),
    total,
    pages: Math.ceil(total / pageSize),
  };
}

export type TeacherDetail = Awaited<ReturnType<typeof getTeacherById>>;

export async function getTeacherById(id: string) {
  await requireAdmin();
  id = idSchema.parse(id);
  const [teacher, paidAgg] = await Promise.all([
    db.teacher.findUniqueOrThrow({
      where: { id },
      include: {
        classes: {
          include: {
            program: { select: { name: true } },
            enrollments: { where: { status: "ACTIVE" }, select: { id: true } },
          },
          orderBy: { name: "asc" },
        },
        // Answers "what did we pay this teacher" directly instead of requiring a scan through
        // expense notes — see docs/09-status-report-and-gap-analysis.md §9.4.
        expenses: { orderBy: { date: "desc" }, take: 24 },
      },
    }),
    db.expense.aggregate({ where: { teacherId: id }, _sum: { amount: true } }),
  ]);

  return {
    ...teacher,
    classes: teacher.classes.map((c) => ({ ...c, standardRate: Number(c.standardRate) })),
    expenses: teacher.expenses.map((e) => ({ ...e, amount: Number(e.amount) })),
    totalPaid: round2(Number(paidAgg._sum.amount ?? 0)),
  };
}

/**
 * Public (no session): the active teachers listed on the website's Instructors page, with the
 * dance programs they currently teach. Selects names only — a teacher's email, phone and notes
 * never leave the admin area.
 *
 * Never throws: the Instructors page must still show the founders if the database is unreachable,
 * so a failure is logged and the list comes back empty (or without programs).
 */
export async function getPublicInstructors(): Promise<PublicInstructor[]> {
  let teachers: { id: string; name: string }[];
  try {
    teachers = await db.teacher.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    });
  } catch (error) {
    console.error("[website] Could not load teachers for the Instructors page:", error);
    return [];
  }
  if (teachers.length === 0) return [];

  const programsByTeacher = new Map<string, Set<string>>();
  try {
    const classes = await db.class.findMany({
      where: { isActive: true, teacherId: { in: teachers.map((teacher) => teacher.id) }, program: { isActive: true } },
      select: { teacherId: true, program: { select: { name: true } } },
    });
    for (const taught of classes) {
      if (!taught.teacherId) continue;
      const programs = programsByTeacher.get(taught.teacherId) ?? new Set<string>();
      programs.add(taught.program.name);
      programsByTeacher.set(taught.teacherId, programs);
    }
  } catch (error) {
    // A warning, not an error: the page still works, listing the teachers by name. Only the
    // message is logged — the full database error would bury the log line that matters.
    console.warn(
      "[website] Instructors page is listing teachers without their programs:",
      error instanceof Error ? error.message.trim().split("\n").pop() : error,
    );
  }

  return teachers.map((teacher) => ({
    name: teacher.name,
    programs: [...(programsByTeacher.get(teacher.id) ?? [])].sort(),
  }));
}

// ---------- Mutations ----------

export async function createTeacher(data: TeacherCreateInput) {
  await requireAdmin();
  data = teacherCreateSchema.parse(data);
  return db.teacher.create({
    data: {
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      notes: data.notes || null,
      isActive: data.isActive,
    },
  });
}

export async function updateTeacher(id: string, data: TeacherUpdateInput) {
  await requireAdmin();
  id = idSchema.parse(id);
  data = teacherUpdateSchema.parse(data);
  return db.teacher.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.phone !== undefined && { phone: data.phone || null }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

export async function toggleTeacherActive(id: string, isActive: boolean) {
  await requireAdmin();
  id = idSchema.parse(id);
  isActive = booleanSchema.parse(isActive);
  return db.teacher.update({ where: { id }, data: { isActive } });
}
