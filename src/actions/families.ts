"use server";

import type { FamilyCreateInput, FamilyUpdateInput } from "@/actions/families.schema";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";


// ---------- Queries ----------

export type FamilyListItem = {
  id: string;
  familyName: string;
  parentGuardianName: string;
  email: string | null;
  phone: string;
  isActive: boolean;
  studentCount: number;
  createdAt: Date;
};

export async function getFamilies(params?: {
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}): Promise<{ data: FamilyListItem[]; total: number; pages: number }> {
  const { search, isActive, page = 1, pageSize = 20, sortBy = "createdAt", sortOrder = "desc" } = params ?? {};

  const where: Prisma.FamilyWhereInput = {};
  if (search) {
    where.OR = [
      { familyName: { contains: search, mode: "insensitive" } },
      { parentGuardianName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }
  if (isActive !== undefined) where.isActive = isActive;

  const [data, total] = await Promise.all([
    db.family.findMany({
      where,
      include: { students: { where: { isActive: true }, select: { id: true } } },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.family.count({ where }),
  ]);

  return {
    data: data.map((f) => ({
      id: f.id,
      familyName: f.familyName,
      parentGuardianName: f.parentGuardianName,
      email: f.email,
      phone: f.phone,
      isActive: f.isActive,
      studentCount: f.students.length,
      createdAt: f.createdAt,
    })),
    total,
    pages: Math.ceil(total / pageSize),
  };
}

export type FamilyDetail = Awaited<ReturnType<typeof getFamilyById>>;

export async function getFamilyById(id: string) {
  return db.family.findUniqueOrThrow({
    where: { id },
    include: {
      students: {
        include: {
          enrollments: {
            where: { status: "ACTIVE" },
            include: { class: { select: { id: true, name: true } } },
          },
        },
        orderBy: { fullName: "asc" },
      },
    },
  });
}

// ---------- Mutations ----------

export async function createFamily(data: FamilyCreateInput) {
  return db.family.create({
    data: {
      familyName: data.familyName,
      parentGuardianName: data.parentGuardianName,
      email: data.email || null,
      phone: data.phone,
      notes: data.notes || null,
    },
  });
}

export async function updateFamily(id: string, data: FamilyUpdateInput) {
  return db.family.update({
    where: { id },
    data: {
      ...(data.familyName !== undefined && { familyName: data.familyName }),
      ...(data.parentGuardianName !== undefined && { parentGuardianName: data.parentGuardianName }),
      ...(data.email !== undefined && { email: data.email || null }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
    },
  });
}

export async function toggleFamilyActive(id: string, isActive: boolean) {
  return db.family.update({ where: { id }, data: { isActive } });
}
