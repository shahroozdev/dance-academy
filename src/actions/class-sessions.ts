"use server";

import { requireAdmin } from "@/actions/access";
import { recalculateClassMonthlyFeeBills } from "@/actions/class-fees";
import { classSessionReportSchema } from "@/actions/class-sessions.schema";
import type { ClassSessionReportInput } from "@/actions/class-sessions.schema";
import { idSchema } from "@/actions/validation.schema";
import { countClassSessionsForMonth, normalizeMonth, round2 } from "@/lib/billing";
import { db } from "@/lib/db";

export async function getMonthlyClassSessionTracking(monthInput: string) {
  await requireAdmin();
  const month = normalizeMonth(monthInput);
  const nextMonth = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));
  const classes = await db.class.findMany({
    where: {
      firstClassDate: { lt: nextMonth },
      OR: [{ inactiveFromMonth: null }, { inactiveFromMonth: { gt: month } }],
    },
    include: {
      teacher: { select: { name: true } },
      program: { select: { name: true } },
      monthlyFees: { where: { month }, take: 1 },
      extraSessions: {
        where: { sessionDate: { gte: month, lt: nextMonth } },
        select: { id: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return classes.map((cls) => {
    const fee = cls.monthlyFees[0] ?? null;
    const scheduledSessions = countClassSessionsForMonth(month, cls.dayOfWeek, cls.firstClassDate);
    const standardRate = Number(cls.standardRate);
    const estimatedMonthlyFee = cls.pricingType === "SEASONAL"
      ? standardRate
      : round2(scheduledSessions * standardRate);
    return {
      classId: cls.id,
      className: cls.name,
      programName: cls.program.name,
      teacherName: cls.teacher?.name ?? null,
      pricingType: cls.pricingType,
      scheduledSessions,
      additionalSessions: cls.extraSessions.length,
      reportedSessions: fee?.reportedSessions ?? null,
      reportNotes: fee?.reportNotes ?? null,
      reportedAt: fee?.reportedAt ?? null,
      appliedSessions: fee?.billableSessions ?? null,
      monthlyClassFee: fee
        ? Number(fee.monthlyClassFee)
        : estimatedMonthlyFee,
      isFinalized: fee?.isFinalized ?? false,
    };
  });
}

export async function reportMonthlyClassSessions(data: ClassSessionReportInput) {
  await requireAdmin();
  data = classSessionReportSchema.parse(data);
  const month = normalizeMonth(data.month);
  const cls = await db.class.findUniqueOrThrow({ where: { id: data.classId } });
  const scheduledSessions = countClassSessionsForMonth(month, cls.dayOfWeek, cls.firstClassDate);
  const rate = round2(Number(cls.standardRate));
  const defaults = cls.pricingType === "SEASONAL"
    ? { billableSessions: null, rate: null, flatFee: rate, monthlyClassFee: rate }
    : { billableSessions: scheduledSessions, rate, flatFee: null, monthlyClassFee: round2(scheduledSessions * rate) };

  return db.classMonthlyFee.upsert({
    where: { classId_month: { classId: cls.id, month } },
    create: {
      classId: cls.id,
      month,
      ...defaults,
      reportedSessions: data.reportedSessions,
      reportNotes: data.reportNotes || null,
      reportedAt: new Date(),
    },
    update: {
      reportedSessions: data.reportedSessions,
      reportNotes: data.reportNotes || null,
      reportedAt: new Date(),
    },
  });
}

export async function applyReportedClassSessions(classMonthlyFeeId: string) {
  await requireAdmin();
  classMonthlyFeeId = idSchema.parse(classMonthlyFeeId);
  const fee = await db.classMonthlyFee.findUniqueOrThrow({
    where: { id: classMonthlyFeeId },
    include: { class: true },
  });
  if (fee.reportedSessions === null) throw new Error("No teacher session count has been reported.");
  if (fee.class.pricingType === "SEASONAL") {
    return { applied: false, recalculated: 0, skippedWithPayments: 0 };
  }
  const rate = fee.rate === null ? Number(fee.class.standardRate) : Number(fee.rate);
  await db.classMonthlyFee.update({
    where: { id: fee.id },
    data: {
      billableSessions: fee.reportedSessions,
      rate,
      monthlyClassFee: round2(fee.reportedSessions * rate),
      notes: fee.reportNotes,
      isOverridden: true,
      isFinalized: false,
      finalizedAt: null,
    },
  });
  const result = await recalculateClassMonthlyFeeBills(fee.id);
  return { applied: true, ...result };
}
