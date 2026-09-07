"use server";

import { requireAdmin } from "@/actions/access";
import { otherIncomeCreateSchema, otherIncomeUpdateSchema } from "@/actions/other-income.schema";
import type { OtherIncomeCreateInput, OtherIncomeUpdateInput } from "@/actions/other-income.schema";
import { idSchema , validateListQuery } from "@/actions/validation.schema";
import type { OtherIncomeCategory, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export async function getOtherIncome(params?: {
  category?: OtherIncomeCategory;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireAdmin();
  validateListQuery(params, []);
  const { category, dateFrom, dateTo, page = 1, pageSize = 50 } = params ?? {};

  const where: Prisma.OtherIncomeWhereInput = {};
  if (category) where.category = category;
  if (dateFrom || dateTo) {
    where.date = {
      ...(dateFrom && { gte: new Date(dateFrom) }),
      ...(dateTo && { lte: new Date(dateTo) }),
    };
  }

  const [data, total] = await Promise.all([
    db.otherIncome.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.otherIncome.count({ where }),
  ]);

  return {
    data: data.map((i) => ({ ...i, amount: Number(i.amount) })),
    total,
    pages: Math.ceil(total / pageSize),
  };
}

export type OtherIncomeDetail = Awaited<ReturnType<typeof getOtherIncomeById>>;

export async function getOtherIncomeById(id: string) {
  await requireAdmin();
  id = idSchema.parse(id);
  const income = await db.otherIncome.findUniqueOrThrow({ where: { id } });
  return { ...income, amount: Number(income.amount) };
}

export async function createOtherIncome(data: OtherIncomeCreateInput) {
  await requireAdmin();
  data = otherIncomeCreateSchema.parse(data);
  return db.otherIncome.create({
    data: {
      date: new Date(data.date),
      category: data.category,
      description: data.description,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      notes: data.notes || null,
    },
  });
}

export async function updateOtherIncome(id: string, data: OtherIncomeUpdateInput) {
  await requireAdmin();
  id = idSchema.parse(id);
  data = otherIncomeUpdateSchema.parse(data);
  return db.otherIncome.update({
    where: { id },
    data: {
      ...(data.date !== undefined && { date: new Date(data.date) }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
    },
  });
}

export async function deleteOtherIncome(id: string) {
  await requireAdmin();
  id = idSchema.parse(id);
  await db.otherIncome.delete({ where: { id } });
}
