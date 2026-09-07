"use server";

import type { TeacherCreateInput, TeacherUpdateInput } from "@/actions/teachers.schema";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

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
  return db.teacher.findUniqueOrThrow({
    where: { id },
    include: {
      classes: {
        include: {
          enrollments: { where: { status: "ACTIVE" }, select: { id: true } },
        },
        orderBy: { name: "asc" },
      },
    },
  });
}

// ---------- Mutations ----------

export async function createTeacher(data: TeacherCreateInput) {
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
  return db.teacher.update({ where: { id }, data: { isActive } });
}
