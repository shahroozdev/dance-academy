"use server";

import { requireAdmin } from "@/actions/access";
import { recordBillTransaction } from "@/actions/payment-service";
import { paymentCreateSchema, refundCreateSchema } from "@/actions/payments.schema";
import type { PaymentCreateInput, RefundCreateInput } from "@/actions/payments.schema";
import { validateListQuery } from "@/actions/validation.schema";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export async function getPayments(params?: {
  billingId?: string;
  studentId?: string;
  familyId?: string;
  method?: "ZELLE" | "CASH" | "CHECK" | "OTHER";
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireAdmin();
  validateListQuery(params, []);
  const { billingId, studentId, familyId, method, dateFrom, dateTo, search, page = 1, pageSize = 50 } = params ?? {};

  const where: Prisma.PaymentWhereInput = {};
  if (billingId) where.billingId = billingId;
  if (method) where.method = method;
  if (dateFrom || dateTo) {
    where.paymentDate = {
      ...(dateFrom && { gte: new Date(dateFrom) }),
      ...(dateTo && { lte: new Date(dateTo) }),
    };
  }
  if (studentId || familyId || search) {
    where.billing = {
      student: {
        ...(studentId && { id: studentId }),
        ...(familyId && { familyId }),
        ...(search && {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { family: { familyName: { contains: search, mode: "insensitive" } } },
          ],
        }),
      },
    };
  }

  const [data, total] = await Promise.all([
    db.payment.findMany({
      where,
      include: {
        billing: {
          select: {
            id: true,
            month: true,
            student: { select: { id: true, fullName: true, familyId: true, family: { select: { familyName: true } } } },
          },
        },
      },
      orderBy: { paymentDate: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.payment.count({ where }),
  ]);

  return {
    data: data.map((p) => ({
      id: p.id,
      billingId: p.billingId,
      month: p.billing.month,
      studentId: p.billing.student.id,
      studentName: p.billing.student.fullName,
      familyId: p.billing.student.familyId,
      familyName: p.billing.student.family.familyName,
      paymentDate: p.paymentDate,
      amount: Number(p.amount),
      method: p.method,
      reference: p.reference,
      notes: p.notes,
    })),
    total,
    pages: Math.ceil(total / pageSize),
  };
}

// Recomputes amountPaid/balance/status server-side from the sum of linked Payments — never
// trusts a client-sent balance (§10).
export async function createPayment(data: PaymentCreateInput) {
  await requireAdmin();
  data = paymentCreateSchema.parse(data);
  return recordBillTransaction(data, false);
}

export async function createRefund(data: RefundCreateInput) {
  await requireAdmin();
  return recordBillTransaction(refundCreateSchema.parse(data), true);
}
