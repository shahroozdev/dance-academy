"use server";

import type { ClassMonthlyFeeUpdateInput } from "@/actions/class-fees.schema";
import type { Prisma } from "@/generated/prisma/client";
import { normalizeMonth } from "@/lib/billing";
import { db } from "@/lib/db";

export async function getClassMonthlyFees(params?: {
  month?: string;
  classId?: string;
  page?: number;
  pageSize?: number;
}) {
  const { month, classId, page = 1, pageSize = 50 } = params ?? {};

  const where: Prisma.ClassMonthlyFeeWhereInput = {};
  if (month) where.month = normalizeMonth(month);
  if (classId) where.classId = classId;

  const [data, total] = await Promise.all([
    db.classMonthlyFee.findMany({
      where,
      include: { class: { select: { id: true, name: true, danceStyle: true, pricingType: true } } },
      orderBy: [{ month: "desc" }, { class: { name: "asc" } }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.classMonthlyFee.count({ where }),
  ]);

  return {
    data: data.map((f) => ({
      ...f,
      rate: f.rate === null ? null : Number(f.rate),
      flatFee: f.flatFee === null ? null : Number(f.flatFee),
      monthlyClassFee: Number(f.monthlyClassFee),
    })),
    total,
    pages: Math.ceil(total / pageSize),
  };
}

export type ClassMonthlyFeeDetail = Awaited<ReturnType<typeof getClassMonthlyFeeById>>;

export async function getClassMonthlyFeeById(id: string) {
  const fee = await db.classMonthlyFee.findUniqueOrThrow({ where: { id }, include: { class: true } });
  return {
    ...fee,
    rate: fee.rate === null ? null : Number(fee.rate),
    flatFee: fee.flatFee === null ? null : Number(fee.flatFee),
    monthlyClassFee: Number(fee.monthlyClassFee),
    class: { ...fee.class, standardRate: Number(fee.class.standardRate) },
  };
}

export async function updateClassMonthlyFee(id: string, data: ClassMonthlyFeeUpdateInput) {
  return db.classMonthlyFee.update({
    where: { id },
    data: {
      billableSessions: data.billableSessions ?? null,
      rate: data.rate ?? null,
      flatFee: data.flatFee ?? null,
      monthlyClassFee: data.monthlyClassFee,
      notes: data.notes || null,
      isOverridden: true,
    },
  });
}
