"use server";

import { requireAdmin } from "@/actions/access";
import { familyCreateSchema, familyUpdateSchema } from "@/actions/families.schema";
import type { FamilyCreateInput, FamilyUpdateInput } from "@/actions/families.schema";
import { deleteStudentRecords } from "@/actions/record-deletion";
import { serializableTransaction } from "@/actions/transaction";
import { booleanSchema, idSchema, validateListQuery } from "@/actions/validation.schema";
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
  await requireAdmin();
  validateListQuery(params, ["familyName","parentGuardianName","email","phone","isActive","createdAt"]);
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
  await requireAdmin();
  id = idSchema.parse(id);
  return db.family.findUniqueOrThrow({
    where: { id },
    include: {
      guardians: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
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
  await requireAdmin();
  data = familyCreateSchema.parse(data);
  return serializableTransaction(async (tx) => {
    const family = await tx.family.create({
      data: {
        familyName: data.familyName,
        parentGuardianName: data.parentGuardianName,
        email: data.email || null,
        phone: data.phone,
        notes: data.notes || null,
      },
    });
    await tx.familyGuardian.create({
      data: {
        familyId: family.id,
        name: data.parentGuardianName,
        email: data.email || null,
        phone: data.phone,
        isPrimary: true,
        receivesNotifications: true,
      },
    });
    return family;
  });
}

export async function updateFamily(id: string, data: FamilyUpdateInput) {
  await requireAdmin();
  id = idSchema.parse(id);
  data = familyUpdateSchema.parse(data);
  return serializableTransaction(async (tx) => {
    const family = await tx.family.update({
      where: { id },
      data: {
        ...(data.familyName !== undefined && { familyName: data.familyName }),
        ...(data.parentGuardianName !== undefined && { parentGuardianName: data.parentGuardianName }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
      },
    });
    const primary = await tx.familyGuardian.findFirst({ where: { familyId: id, isPrimary: true } });
    if (primary) {
      await tx.familyGuardian.update({
        where: { id: primary.id },
        data: {
          ...(data.parentGuardianName !== undefined && { name: data.parentGuardianName }),
          ...(data.email !== undefined && { email: data.email || null }),
          ...(data.phone !== undefined && { phone: data.phone }),
        },
      });
    }
    return family;
  });
}

export async function toggleFamilyActive(id: string, isActive: boolean) {
  await requireAdmin();
  id = idSchema.parse(id);
  isActive = booleanSchema.parse(isActive);
  return db.family.update({ where: { id }, data: { isActive } });
}

export async function deleteFamily(id: string, confirmationName: string) {
  await requireAdmin();
  id = idSchema.parse(id);
  confirmationName = idSchema.parse(confirmationName);

  return serializableTransaction(async (tx) => {
    const family = await tx.family.findUniqueOrThrow({
      where: { id },
      select: { id: true, familyName: true, students: { select: { id: true } } },
    });
    if (confirmationName !== family.familyName) {
      throw new Error("Type the family's exact name to confirm deletion.");
    }

    const studentIds = family.students.map((student) => student.id);
    await deleteStudentRecords(tx, studentIds);
    await tx.registrationRequest.deleteMany({ where: { matchedFamilyId: family.id } });
    await tx.notificationLog.deleteMany({ where: { familyId: family.id } });
    await tx.family.delete({ where: { id: family.id } });

    return { familyId: family.id, studentsDeleted: studentIds.length };
  });
}
