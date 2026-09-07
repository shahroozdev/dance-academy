"use server";

import { requireAdmin } from "@/actions/access";
import { studentCreateSchema, studentImportSchema, studentUpdateSchema } from "@/actions/students.schema";
import type { StudentCreateInput, StudentImportRow, StudentUpdateInput } from "@/actions/students.schema";
import { serializableTransaction } from "@/actions/transaction";
import { idSchema, booleanSchema , validateListQuery } from "@/actions/validation.schema";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { matchRegistrationFamily } from "@/lib/family-matching";


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
  await requireAdmin();
  validateListQuery(params, ["fullName","dob","gender","isActive","createdAt"]);
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
  await requireAdmin();
  id = idSchema.parse(id);
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
  await requireAdmin();
  data = studentCreateSchema.parse(data);
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
  await requireAdmin();
  id = idSchema.parse(id);
  data = studentUpdateSchema.parse(data);
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
  await requireAdmin();
  id = idSchema.parse(id);
  isActive = booleanSchema.parse(isActive);
  return db.student.update({ where: { id }, data: { isActive } });
}

// ---------- CSV import ----------

export type StudentImportResult = {
  row: number;
  studentName: string;
  status: "created" | "skipped" | "error";
  message?: string;
};

const IMPORT_GENDER_MAP: Record<string, "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY"> = {
  male: "MALE",
  female: "FEMALE",
  other: "OTHER",
  "prefer not to say": "PREFER_NOT_TO_SAY",
};

function parseImportGender(value: string | undefined) {
  if (!value?.trim()) return null;
  return IMPORT_GENDER_MAP[value.trim().toLowerCase()] ?? null;
}

function parseImportDob(value: string | undefined): Date | null {
  if (!value?.trim()) return null;
  const trimmed = value.trim();
  // An explicit ISO date is trusted as-is so "01/02/2020" isn't silently misread as the wrong
  // month/day; anything else falls back to whatever the runtime's Date parser can make of it.
  const date = /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? new Date(`${trimmed}T00:00:00`) : new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Imports rows one at a time (not Promise.all) — a later row for the same household, matched by
// phone/email, must see the family an earlier row in this same batch just created. Each row is its
// own transaction so one bad row can't roll back rows already imported.
export async function importStudents(rows: StudentImportRow[]): Promise<StudentImportResult[]> {
  await requireAdmin();
  rows = studentImportSchema.parse(rows);

  const results: StudentImportResult[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +1 for 1-indexing, +1 for the header row
    const studentName = row.studentName.trim();

    try {
      if (!studentName) throw new Error("Student name is required");

      const phone = row.parentPhone?.trim() || undefined;
      const email = row.parentEmail?.trim() || undefined;

      const outcome = await serializableTransaction(async (tx) => {
        const candidates = await tx.family.findMany({ select: { id: true, phone: true, email: true, familyName: true } });
        let family = phone || email ? matchRegistrationFamily(candidates, phone ?? "", email ?? null) : null;

        if (!family) {
          const familyName = row.familyName?.trim();
          const parentGuardianName = row.parentGuardianName?.trim();
          if (!familyName || !parentGuardianName || !phone) {
            throw new Error(
              "No existing family matched Parent Phone/Email — Family Name, Parent/Guardian Name, and Parent Phone are required to create a new family",
            );
          }
          family = await tx.family.create({
            data: { familyName, parentGuardianName, phone, email: email ?? null },
          });
        }

        const existingStudent = await tx.student.findFirst({
          where: { familyId: family.id, fullName: { equals: studentName, mode: "insensitive" } },
        });
        if (existingStudent) {
          return { status: "skipped" as const, message: `Already exists in ${family.familyName}` };
        }

        await tx.student.create({
          data: {
            fullName: studentName,
            familyId: family.id,
            dob: parseImportDob(row.dob),
            gender: parseImportGender(row.gender),
            isActive: row.isActive ?? true,
          },
        });
        return { status: "created" as const, message: undefined };
      });

      results.push({ row: rowNumber, studentName, status: outcome.status, message: outcome.message });
    } catch (error) {
      results.push({
        row: rowNumber,
        studentName,
        status: "error",
        message: error instanceof Error ? error.message : "Could not import this row",
      });
    }
  }

  return results;
}
