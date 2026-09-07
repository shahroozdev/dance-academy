"use server";
import { put } from "@vercel/blob";

import { requireAdmin } from "@/actions/access";
import { expenseCreateSchema, expenseUpdateSchema } from "@/actions/expenses.schema";
import type { ExpenseCreateInput, ExpenseUpdateInput } from "@/actions/expenses.schema";
import { validateListQuery , idSchema } from "@/actions/validation.schema";
import type { ExpenseCategory, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export async function getExpenses(params?: {
  category?: ExpenseCategory;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireAdmin();
  validateListQuery(params, []);
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
      include: { teacher: { select: { id: true, name: true } } },
      orderBy: { date: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.expense.count({ where }),
  ]);

  return {
    data: data.map((e) => ({ ...e, amount: Number(e.amount), teacherName: e.teacher?.name ?? null })),
    total,
    pages: Math.ceil(total / pageSize),
  };
}

export type ExpenseDetail = Awaited<ReturnType<typeof getExpenseById>>;

export async function getExpenseById(id: string) {
  await requireAdmin();
  id = idSchema.parse(id);
  const expense = await db.expense.findUniqueOrThrow({
    where: { id },
    include: { teacher: { select: { id: true, name: true } } },
  });
  return { ...expense, amount: Number(expense.amount) };
}

export async function createExpense(data: ExpenseCreateInput) {
  await requireAdmin();
  data = expenseCreateSchema.parse(data);
  return db.expense.create({
    data: {
      date: new Date(data.date),
      category: data.category,
      description: data.description,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      notes: data.notes || null,
      receiptUrl: data.receiptUrl || null,
      teacherId: data.teacherId || null,
    },
  });
}

export async function updateExpense(id: string, data: ExpenseUpdateInput) {
  await requireAdmin();
  id = idSchema.parse(id);
  data = expenseUpdateSchema.parse(data);
  return db.expense.update({
    where: { id },
    data: {
      ...(data.date !== undefined && { date: new Date(data.date) }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.amount !== undefined && { amount: data.amount }),
      ...(data.paymentMethod !== undefined && { paymentMethod: data.paymentMethod }),
      ...(data.notes !== undefined && { notes: data.notes || null }),
      ...(data.receiptUrl !== undefined && { receiptUrl: data.receiptUrl || null }),
      ...(data.teacherId !== undefined && { teacherId: data.teacherId || null }),
    },
  });
}

export async function deleteExpense(id: string) {
  await requireAdmin();
  id = idSchema.parse(id);
  await db.expense.delete({ where: { id } });
}

// Uploads to Blob only and hands back the URL — it doesn't touch the Expense row itself, so the
// same call works whether the expense already exists or is still being drafted in the create
// form; the caller folds the URL into the create/update payload like any other field.
export async function uploadExpenseReceipt(formData: FormData): Promise<{ url: string }> {
  await requireAdmin();
  const file = formData.get("receipt") as File | null;
  if (!file || file.size === 0) {
    throw new Error("No file provided.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Receipt must be under 5 MB.");
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/webp", "application/pdf"];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Receipt must be PNG, JPEG, WebP, or PDF.");
  }

  const ext = file.name.split(".").pop() ?? "pdf";
  const blob = await put(`expense-receipt.${ext}`, file, {
    access: "public",
    addRandomSuffix: true,
  });

  return { url: blob.url };
}
