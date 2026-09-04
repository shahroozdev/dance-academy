"use server";

import type { StudentCreateInput, StudentUpdateInput } from "@/actions/students.schema";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";


// ---------- Queries ----------

export type StudentListItem = {
  id: string;
  fullName: string;
  familyId: string;
  familyName: string;
  dob: Date | null;
  gender: string | null;
  isActive: boolean;
  enrollments: { className: string }[];
  createdAt: Date;
};

export async function getStudents(params?: {
  search?: string;
  isActive?: boolean;
  classId?: string;
  familyId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}): Promise<{ data: StudentListItem[]; total: number; pages: number }> {
  const {
    search,
    isActive,
    classId,
    familyId,
    page = 1,
    pageSize = 20,
    sortBy = "fullName",
    sortOrder = "asc",
  } = params ?? {};

  const where: Prisma.StudentWhereInput = {};
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: "insensitive" } },
      { family: { familyName: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (isActive !== undefined) where.isActive = isActive;
  if (familyId) where.familyId = familyId;
  if (classId) {
    where.enrollments = { some: { classId, status: "ACTIVE" } };
  }

  const [data, total] = await Promise.all([
    db.student.findMany({
      where,
      include: {
        family: { select: { familyName: true } },
        enrollments: {
          where: { status: "ACTIVE" },
          include: { class: { select: { name: true } } },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.student.count({ where }),
  ]);

  return {
    data: data.map((s) => ({
      id: s.id,
      fullName: s.fullName,
      familyId: s.familyId,
      familyName: s.family.familyName,
      dob: s.dob,
      gender: s.gender,
      isActive: s.isActive,
      enrollments: s.enrollments.map((e) => ({ className: e.class.name })),
      createdAt: s.createdAt,
    })),
    total,
    pages: Math.ceil(total / pageSize),
  };
}

export type StudentDetail = Awaited<ReturnType<typeof getStudentById>>;

export async function getStudentById(id: string) {
  const student = await db.student.findUniqueOrThrow({
    where: { id },
    include: {
      family: true,
      enrollments: {
        include: { class: true },
        orderBy: { startDate: "desc" },
      },
      monthlyBillings: {
        orderBy: { month: "desc" },
        take: 12,
      },
    },
  });

  return {
    ...student,
    enrollments: student.enrollments.map((e) => ({
      ...e,
      class: { ...e.class, standardRate: Number(e.class.standardRate) },
    })),
    monthlyBillings: student.monthlyBillings.map((b) => ({
      ...b,
      baseTuition: Number(b.baseTuition),
      multiClassDiscount: Number(b.multiClassDiscount),
      siblingDiscount: Number(b.siblingDiscount),
      adjustment: Number(b.adjustment),
      finalAmountDue: Number(b.finalAmountDue),
      amountPaid: Number(b.amountPaid),
      balance: Number(b.balance),
    })),
  };
}

// ---------- Mutations ----------

export async function createStudent(data: StudentCreateInput) {
  return db.student.create({
    data: {
      fullName: data.fullName,
      familyId: data.familyId,
      dob: data.dob ? new Date(data.dob) : null,
      gender: data.gender ?? null,
      medicalNotes: data.medicalNotes || null,
      generalNotes: data.generalNotes || null,
      emergencyContactName: data.emergencyContactName || null,
      emergencyContactRelationship: data.emergencyContactRelationship || null,
      emergencyPhone: data.emergencyPhone || null,
    },
  });
}

export async function updateStudent(id: string, data: StudentUpdateInput) {
  return db.student.update({
    where: { id },
    data: {
      ...(data.fullName !== undefined && { fullName: data.fullName }),
      ...(data.familyId !== undefined && { familyId: data.familyId }),
      ...(data.dob !== undefined && { dob: data.dob ? new Date(data.dob) : null }),
      ...(data.gender !== undefined && { gender: data.gender ?? null }),
      ...(data.medicalNotes !== undefined && { medicalNotes: data.medicalNotes || null }),
      ...(data.generalNotes !== undefined && { generalNotes: data.generalNotes || null }),
      ...(data.emergencyContactName !== undefined && {
        emergencyContactName: data.emergencyContactName || null,
      }),
      ...(data.emergencyContactRelationship !== undefined && {
        emergencyContactRelationship: data.emergencyContactRelationship || null,
      }),
      ...(data.emergencyPhone !== undefined && { emergencyPhone: data.emergencyPhone || null }),
    },
  });
}

export async function toggleStudentActive(id: string, isActive: boolean) {
  return db.student.update({ where: { id }, data: { isActive } });
}
