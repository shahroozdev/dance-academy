"use server";

import type { ExpenseCreateInput, ExpenseUpdateInput } from "@/actions/expenses.schema";
import type { ExpenseCategory, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export async function getExpenses(params?: {
  category?: ExpenseCategory;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  const { category, dateFrom, dateTo, page = 1, pageSize = 50 } = params ?? {};

  const where: Prisma.ExpenseWhereInput = {};
  if (category) where.category = category;
  if (dateFrom || dateTo) {
    where.date = {
      ...(dateFrom && { gte: new Date(dateFrom) }),
      ...(dateTo && { lte: new Date(dateTo) }),
    };
  }

  const [data, total] = await Promise.all([
    db.expense.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.expense.count({ where }),
  ]);

  return {
    data: data.map((e) => ({ ...e, amount: Number(e.amount) })),
    total,
    pages: Math.ceil(total / pageSize),
  };
}

export type ExpenseDetail = Awaited<ReturnType<typeof getExpenseById>>;

export async function getExpenseById(id: string) {
  const expense = await db.expense.findUniqueOrThrow({ where: { id } });
  return { ...expense, amount: Number(expense.amount) };
}

export async function createExpense(data: ExpenseCreateInput) {
  return db.expense.create({
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

export async function updateExpense(id: string, data: ExpenseUpdateInput) {
  return db.expense.update({
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
