"use server";

import type { ClassCreateInput, ClassUpdateInput } from "@/actions/classes.schema";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";


// ---------- Queries ----------

export type ClassListItem = {
  id: string;
  name: string;
  danceStyle: string;
  level: string | null;
  teacher: string | null;
  dayOfWeek: string | null;
  startTime: string | null;
  endTime: string | null;
  standardRate: number;
  pricingType: string;
  isActive: boolean;
  discountEligible: boolean;
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
  const { search, isActive, page = 1, pageSize = 20, sortBy = "name", sortOrder = "asc" } = params ?? {};

  const where: Prisma.ClassWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { danceStyle: { contains: search, mode: "insensitive" } },
      { teacher: { contains: search, mode: "insensitive" } },
    ];
  }
  if (isActive !== undefined) where.isActive = isActive;

  const [data, total] = await Promise.all([
    db.class.findMany({
      where,
      include: {
        enrollments: { where: { status: "ACTIVE" }, select: { id: true } },
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
      teacher: c.teacher,
      dayOfWeek: c.dayOfWeek,
      startTime: c.startTime,
      endTime: c.endTime,
      standardRate: Number(c.standardRate),
      pricingType: c.pricingType,
      isActive: c.isActive,
      discountEligible: c.discountEligible,
      enrollmentCount: c.enrollments.length,
      createdAt: c.createdAt,
    })),
    total,
    pages: Math.ceil(total / pageSize),
  };
}

export type ClassDetail = Awaited<ReturnType<typeof getClassById>>;

export async function getClassById(id: string) {
  const cls = await db.class.findUniqueOrThrow({
    where: { id },
    include: {
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
  return db.class.create({
    data: {
      name: data.name,
      danceStyle: data.danceStyle,
      level: data.level || null,
      teacher: data.teacher || null,
      dayOfWeek: data.dayOfWeek ?? null,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      durationMins: data.durationMins ?? null,
      standardRate: data.standardRate,
      pricingType: data.pricingType,
      discountEligible: data.discountEligible,
      isActive: data.isActive,
    },
  });
}

export async function updateClass(id: string, data: ClassUpdateInput) {
  return db.class.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.danceStyle !== undefined && { danceStyle: data.danceStyle }),
      ...(data.level !== undefined && { level: data.level || null }),
      ...(data.teacher !== undefined && { teacher: data.teacher || null }),
      ...(data.dayOfWeek !== undefined && { dayOfWeek: data.dayOfWeek ?? null }),
      ...(data.startTime !== undefined && { startTime: data.startTime || null }),
      ...(data.endTime !== undefined && { endTime: data.endTime || null }),
      ...(data.durationMins !== undefined && { durationMins: data.durationMins ?? null }),
      ...(data.standardRate !== undefined && { standardRate: data.standardRate }),
      ...(data.pricingType !== undefined && { pricingType: data.pricingType }),
      ...(data.discountEligible !== undefined && { discountEligible: data.discountEligible }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

export async function toggleClassActive(id: string, isActive: boolean) {
  return db.class.update({ where: { id }, data: { isActive } });
}

// ---------- Roster ----------

export async function getClassRoster(classId: string) {
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
