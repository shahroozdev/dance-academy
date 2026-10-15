"use server";

import { requireAdmin } from "@/actions/access";
import { recalculateAllClassFamilyBills, recalculateClassFamilyBillsFromMonth } from "@/actions/billing-impact";
import { classActiveStatusSchema, classCreateSchema, classUpdateSchema } from "@/actions/classes.schema";
import type { ClassCreateInput, ClassUpdateInput } from "@/actions/classes.schema";
import { idSchema, validateListQuery } from "@/actions/validation.schema";
import type { Prisma } from "@/generated/prisma/client";
import { countClassSessionsForMonth, normalizeMonth, round2 } from "@/lib/billing";
import { db } from "@/lib/db";


// ---------- Queries ----------

export type ClassListItem = {
  id: string;
  name: string;
  programId: string;
  programName: string;
  level: string | null;
  teacherId: string | null;
  teacherName: string | null;
  dayOfWeek: string | null;
  firstClassDate: Date;
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
  validateListQuery(params, ["name","level","standardRate","pricingType","isActive","createdAt","dayOfWeek","startTime"]);
  const { search, isActive, page = 1, pageSize = 20, sortBy = "name", sortOrder = "asc" } = params ?? {};

  const where: Prisma.ClassWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { program: { name: { contains: search, mode: "insensitive" } } },
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
        program: { select: { id: true, name: true } },
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
      programId: c.program.id,
      programName: c.program.name,
      level: c.level,
      teacherId: c.teacher?.id ?? null,
      teacherName: c.teacher?.name ?? null,
      dayOfWeek: c.dayOfWeek,
      firstClassDate: c.firstClassDate,
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
      program: { select: { id: true, name: true, isActive: true } },
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
      billingPauses: { orderBy: { startMonth: "desc" } },
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
  const program = await db.danceProgram.findUnique({ where: { id: data.programId }, select: { isActive: true } });
  if (!program?.isActive) throw new Error("Select an active dance program.");
  const cls = await db.class.create({
    data: {
      name: data.name,
      programId: data.programId,
      level: data.level || null,
      teacherId: data.teacherId || null,
      dayOfWeek: data.dayOfWeek ?? null,
      firstClassDate: new Date(`${data.firstClassDate}T00:00:00.000Z`),
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      durationMins: data.durationMins ?? null,
      standardRate: data.standardRate,
      capacity: data.capacity ?? null,
      pricingType: data.pricingType,
      discountEligible: data.discountEligible,
      isActive: data.isActive,
      inactiveFromMonth: data.isActive ? null : normalizeMonth(new Date()),
      lastClassDate: data.isActive ? null : new Date(),
    },
  });
  return { ...cls, standardRate: Number(cls.standardRate) };
}

export async function updateClass(id: string, data: ClassUpdateInput) {
  await requireAdmin();
  id = idSchema.parse(id);
  data = classUpdateSchema.parse(data);
  if (data.programId !== undefined) {
    const [currentClass, program] = await Promise.all([
      db.class.findUniqueOrThrow({ where: { id }, select: { programId: true } }),
      db.danceProgram.findUnique({ where: { id: data.programId }, select: { isActive: true } }),
    ]);
    if (!program || (!program.isActive && currentClass.programId !== data.programId)) {
      throw new Error("Select an active dance program.");
    }
  }
  const cls = await db.$transaction(async (tx) => {
    const updated = await tx.class.update({
      where: { id },
      data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.programId !== undefined && { programId: data.programId }),
      ...(data.level !== undefined && { level: data.level || null }),
      ...(data.teacherId !== undefined && { teacherId: data.teacherId || null }),
      ...(data.dayOfWeek !== undefined && { dayOfWeek: data.dayOfWeek ?? null }),
      ...(data.firstClassDate !== undefined && { firstClassDate: new Date(`${data.firstClassDate}T00:00:00.000Z`) }),
      ...(data.startTime !== undefined && { startTime: data.startTime || null }),
      ...(data.endTime !== undefined && { endTime: data.endTime || null }),
      ...(data.durationMins !== undefined && { durationMins: data.durationMins ?? null }),
      ...(data.standardRate !== undefined && { standardRate: data.standardRate }),
      ...(data.capacity !== undefined && { capacity: data.capacity ?? null }),
      ...(data.pricingType !== undefined && { pricingType: data.pricingType }),
      ...(data.discountEligible !== undefined && { discountEligible: data.discountEligible }),
      ...(data.isActive !== undefined && {
        isActive: data.isActive,
        inactiveFromMonth: data.isActive ? null : normalizeMonth(new Date()),
        lastClassDate: data.isActive ? null : new Date(),
      }),
      },
    });
    if (data.firstClassDate !== undefined) {
      const firstBillingMonth = new Date(`${data.firstClassDate.slice(0, 7)}-01T00:00:00.000Z`);
      await tx.classMonthlyFee.deleteMany({
        where: { classId: id, month: { lt: firstBillingMonth }, lineItems: { none: {} } },
      });
    }
    return updated;
  });
  if (data.firstClassDate !== undefined) {
    const firstBillingMonth = normalizeMonth(cls.firstClassDate);
    const existingFee = await db.classMonthlyFee.findUnique({
      where: { classId_month: { classId: id, month: firstBillingMonth } },
    });
    if (existingFee && !existingFee.isOverridden) {
      const rate = round2(Number(cls.standardRate));
      const billableSessions = countClassSessionsForMonth(firstBillingMonth, cls.dayOfWeek, cls.firstClassDate);
      const regularFee = round2(billableSessions * rate);
      await db.classMonthlyFee.update({
        where: { id: existingFee.id },
        data: cls.pricingType === "SEASONAL"
          ? {
              billableSessions: null,
              rate: null,
              flatFee: rate,
              monthlyClassFee: rate,
              isFinalized: false,
              finalizedAt: null,
            }
          : {
              billableSessions,
              rate,
              flatFee: null,
              monthlyClassFee: regularFee,
              isFinalized: false,
              finalizedAt: null,
            },
      });
    }
    await recalculateAllClassFamilyBills(
      id,
      "The class First Class Date changed after payment was recorded. Review the bill and add an adjustment if needed.",
    );
    await db.classMonthlyFee.deleteMany({
      where: { classId: id, month: { lt: firstBillingMonth }, lineItems: { none: {} } },
    });
  }
  if (data.isActive !== undefined) {
    await recalculateClassFamilyBillsFromMonth(
      id,
      normalizeMonth(new Date()),
      "The class active status changed after a payment was recorded. Review this month and move or adjust the payment if needed.",
    );
  }
  return { ...cls, standardRate: Number(cls.standardRate) };
}

export async function toggleClassActive(id: string, isActive: boolean, lastClassDateInput?: string) {
  await requireAdmin();
  id = idSchema.parse(id);
  const parsed = classActiveStatusSchema.parse({ isActive, lastClassDate: lastClassDateInput });
  const lastClassDate = parsed.isActive ? null : new Date(`${parsed.lastClassDate}T00:00:00.000Z`);
  const inactiveFromMonth = parsed.isActive
    ? null
    : new Date(Date.UTC(lastClassDate!.getUTCFullYear(), lastClassDate!.getUTCMonth() + 1, 1));
  const cls = await db.class.update({
    where: { id },
    data: { isActive: parsed.isActive, inactiveFromMonth, lastClassDate },
  });
  if (lastClassDate && cls.pricingType === "REGULAR") {
    const month = normalizeMonth(lastClassDate);
    const existingFee = await db.classMonthlyFee.findUnique({ where: { classId_month: { classId: id, month } } });
    if (existingFee) {
      const rate = existingFee.rate === null ? Number(cls.standardRate) : Number(existingFee.rate);
      const billableSessions = countClassSessionsForMonth(month, cls.dayOfWeek, cls.firstClassDate, lastClassDate);
      await db.classMonthlyFee.update({
        where: { id: existingFee.id },
        data: {
          billableSessions,
          monthlyClassFee: round2(billableSessions * rate),
          isOverridden: true,
          isFinalized: false,
          finalizedAt: null,
          notes: `Class ended ${parsed.lastClassDate}`,
        },
      });
    }
  }
  await recalculateClassFamilyBillsFromMonth(
    id,
    lastClassDate ? normalizeMonth(lastClassDate) : normalizeMonth(new Date()),
    "The class active status changed after a payment was recorded. Review this month and move or adjust the payment if needed.",
  );
  return { ...cls, standardRate: Number(cls.standardRate) };
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
