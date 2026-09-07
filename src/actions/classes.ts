"use server";

import { requireAdmin } from "@/actions/access";
import { classCreateSchema, classUpdateSchema } from "@/actions/classes.schema";
import type { ClassCreateInput, ClassUpdateInput } from "@/actions/classes.schema";
import { idSchema, booleanSchema , validateListQuery } from "@/actions/validation.schema";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";


// ---------- Queries ----------

export type ClassListItem = {
  id: string;
  name: string;
  danceStyle: string;
  level: string | null;
  teacherId: string | null;
  teacherName: string | null;
  dayOfWeek: string | null;
  startTime: string | null;
  endTime: string | null;
  standardRate: number;
  pricingType: string;
  isActive: boolean;
  discountEligible: boolean;
  capacity: number | null;
  enrollmentCount: number;
  createdAt: Date;
};

export async function getClasses(params?: {
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}): Promise<{ data: ClassListItem[]; total: number; pages: number }> {
  await requireAdmin();
  validateListQuery(params, ["name","danceStyle","level","standardRate","pricingType","isActive","createdAt","dayOfWeek","startTime"]);
  const { search, isActive, page = 1, pageSize = 20, sortBy = "name", sortOrder = "asc" } = params ?? {};

  const where: Prisma.ClassWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { danceStyle: { contains: search, mode: "insensitive" } },
      { teacher: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  if (isActive !== undefined) where.isActive = isActive;

  const [data, total] = await Promise.all([
    db.class.findMany({
      where,
      include: {
        enrollments: { where: { status: "ACTIVE" }, select: { id: true } },
        teacher: { select: { id: true, name: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.class.count({ where }),
  ]);

  return {
    data: data.map((c) => ({
      id: c.id,
      name: c.name,
      danceStyle: c.danceStyle,
      level: c.level,
      teacherId: c.teacher?.id ?? null,
      teacherName: c.teacher?.name ?? null,
      dayOfWeek: c.dayOfWeek,
      startTime: c.startTime,
      endTime: c.endTime,
      standardRate: Number(c.standardRate),
      pricingType: c.pricingType,
      isActive: c.isActive,
      discountEligible: c.discountEligible,
      capacity: c.capacity,
      enrollmentCount: c.enrollments.length,
      createdAt: c.createdAt,
    })),
    total,
    pages: Math.ceil(total / pageSize),
  };
}

export type ClassDetail = Awaited<ReturnType<typeof getClassById>>;

export async function getClassById(id: string) {
  await requireAdmin();
  id = idSchema.parse(id);
  const cls = await db.class.findUniqueOrThrow({
    where: { id },
    include: {
      teacher: { select: { id: true, name: true } },
      enrollments: {
        where: { status: "ACTIVE" },
        include: {
          student: {
            include: { family: { select: { familyName: true } } },
          },
        },
        orderBy: { startDate: "desc" },
      },
      monthlyFees: {
        orderBy: { month: "desc" },
        take: 12,
      },
    },
  });

  return {
    ...cls,
    standardRate: Number(cls.standardRate),
    monthlyFees: cls.monthlyFees.map((f) => ({
      ...f,
      rate: f.rate === null ? null : Number(f.rate),
      flatFee: f.flatFee === null ? null : Number(f.flatFee),
      monthlyClassFee: Number(f.monthlyClassFee),
    })),
  };
}

// ---------- Mutations ----------

export async function createClass(data: ClassCreateInput) {
  await requireAdmin();
  data = classCreateSchema.parse(data);
  return db.class.create({
    data: {
      name: data.name,
      danceStyle: data.danceStyle,
      level: data.level || null,
      teacherId: data.teacherId || null,
      dayOfWeek: data.dayOfWeek ?? null,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      durationMins: data.durationMins ?? null,
      standardRate: data.standardRate,
      capacity: data.capacity ?? null,
      pricingType: data.pricingType,
      discountEligible: data.discountEligible,
      isActive: data.isActive,
    },
  });
}

export async function updateClass(id: string, data: ClassUpdateInput) {
  await requireAdmin();
  id = idSchema.parse(id);
  data = classUpdateSchema.parse(data);
  return db.class.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.danceStyle !== undefined && { danceStyle: data.danceStyle }),
      ...(data.level !== undefined && { level: data.level || null }),
      ...(data.teacherId !== undefined && { teacherId: data.teacherId || null }),
      ...(data.dayOfWeek !== undefined && { dayOfWeek: data.dayOfWeek ?? null }),
      ...(data.startTime !== undefined && { startTime: data.startTime || null }),
      ...(data.endTime !== undefined && { endTime: data.endTime || null }),
      ...(data.durationMins !== undefined && { durationMins: data.durationMins ?? null }),
      ...(data.standardRate !== undefined && { standardRate: data.standardRate }),
      ...(data.capacity !== undefined && { capacity: data.capacity ?? null }),
      ...(data.pricingType !== undefined && { pricingType: data.pricingType }),
      ...(data.discountEligible !== undefined && { discountEligible: data.discountEligible }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

export async function toggleClassActive(id: string, isActive: boolean) {
  await requireAdmin();
  id = idSchema.parse(id);
  isActive = booleanSchema.parse(isActive);
  return db.class.update({ where: { id }, data: { isActive } });
}

// ---------- Roster ----------

export async function getClassRoster(classId: string) {
  await requireAdmin();
  classId = idSchema.parse(classId);
  return db.enrollment.findMany({
    where: { classId, status: "ACTIVE" },
    include: {
      student: {
        include: {
          family: { select: { familyName: true, phone: true } },
        },
      },
    },
    orderBy: { student: { fullName: "asc" } },
  });
}

export async function getRegistrationClasses() {
  return db.class.findMany({ where: { isActive: true }, select: { id: true, name: true, danceStyle: true }, orderBy: { name: "asc" } });
}
