"use server";
import { requireAdmin } from "@/actions/access";
import { buildLineItemInputs, familyQualifyingSiblingCount, generateMonthlyBilling as runMonthlyBilling } from "@/actions/billing-service";
import { billingAdjustmentSchema } from "@/actions/billing.schema";
import type { BillingAdjustmentInput } from "@/actions/billing.schema";
import { sendAdminOperationalAlert } from "@/actions/email";
import { serializableTransaction } from "@/actions/transaction";
import { validateListQuery , idSchema } from "@/actions/validation.schema";
import type { Prisma } from "@/generated/prisma/client";
import {
  computeBillingStatus,
  computeStudentBilling,
  normalizeMonth,
  round2,
} from "@/lib/billing";
import { db } from "@/lib/db";
import { getMultiClassDiscountPct, getSiblingDiscountPct } from "@/lib/settings";

export async function generateMonthlyBilling(monthInput: string) {
  await requireAdmin();
  return runMonthlyBilling(monthInput);
}

// ---------- Queries ----------

export async function getMonthlyBillings(params: {
  month: string;
  status?: "UNPAID" | "PARTIAL" | "PAID" | "OVERPAID";
  classId?: string;
  familyId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  await requireAdmin();
  validateListQuery(params, []);
  const { month: monthInput, status, classId, familyId, search, page = 1, pageSize = 200 } = params;
  const month = normalizeMonth(monthInput);

  const where: Prisma.MonthlyStudentBillingWhereInput = { month };
  if (status) where.status = status;
  if (familyId) where.student = { familyId };
  if (classId) {
    where.lineItems = { some: { enrollment: { classId } } };
  }
  if (search) {
    where.student = {
      ...(where.student as object),
      OR: [
        { fullName: { contains: search, mode: "insensitive" } },
        { family: { familyName: { contains: search, mode: "insensitive" } } },
      ],
    };
  }

  const [data, total] = await Promise.all([
    db.monthlyStudentBilling.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true, familyId: true, family: { select: { familyName: true } } } },
        lineItems: { include: { enrollment: { include: { class: { select: { id: true, name: true } } } } } },
      },
      orderBy: [{ student: { family: { familyName: "asc" } } }, { student: { fullName: "asc" } }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.monthlyStudentBilling.count({ where }),
  ]);

  return {
    data: data.map((b) => ({
      id: b.id,
      studentId: b.studentId,
      studentName: b.student.fullName,
      familyId: b.student.familyId,
      familyName: b.student.family.familyName,
      month: b.month,
      classNames: b.lineItems.map((li) => li.enrollment.class.name),
      baseTuition: Number(b.baseTuition),
      multiClassDiscount: Number(b.multiClassDiscount),
      siblingDiscount: Number(b.siblingDiscount),
      adjustment: Number(b.adjustment),
      finalAmountDue: Number(b.finalAmountDue),
      amountPaid: Number(b.amountPaid),
      balance: Number(b.balance),
      status: b.status,
      notificationStatus: b.notificationStatus,
    })),
    total,
    pages: Math.ceil(total / pageSize),
  };
}

export type MonthlyBillingDetail = Awaited<ReturnType<typeof getMonthlyBillingById>>;

export async function getMonthlyBillingById(id: string) {
  await requireAdmin();
  id = idSchema.parse(id);
  const billing = await db.monthlyStudentBilling.findUniqueOrThrow({
    where: { id },
    include: {
      student: { include: { family: true } },
      lineItems: { include: { enrollment: { include: { class: true } }, classMonthlyFee: true } },
      payments: { orderBy: { paymentDate: "desc" } },
    },
  });

  return {
    ...billing,
    baseTuition: Number(billing.baseTuition),
    multiClassDiscount: Number(billing.multiClassDiscount),
    siblingDiscount: Number(billing.siblingDiscount),
    adjustment: Number(billing.adjustment),
    finalAmountDue: Number(billing.finalAmountDue),
    amountPaid: Number(billing.amountPaid),
    balance: Number(billing.balance),
    lineItems: billing.lineItems.map((li) => ({
      ...li,
      amount: Number(li.amount),
      enrollment: {
        ...li.enrollment,
        class: { ...li.enrollment.class, standardRate: Number(li.enrollment.class.standardRate) },
      },
      classMonthlyFee: {
        ...li.classMonthlyFee,
        rate: li.classMonthlyFee.rate === null ? null : Number(li.classMonthlyFee.rate),
        flatFee: li.classMonthlyFee.flatFee === null ? null : Number(li.classMonthlyFee.flatFee),
        monthlyClassFee: Number(li.classMonthlyFee.monthlyClassFee),
      },
    })),
    payments: billing.payments.map((p) => ({ ...p, amount: Number(p.amount) })),
  };
}

// ---------- Mutations ----------

// Allowed on a PAID bill on purpose — a negative adjustment with a note is the studio's chosen
// refund policy (docs/09-status-report-and-gap-analysis.md §9.4): it pushes finalAmountDue below
// amountPaid, which computeBillingStatus below correctly reads as OVERPAID, the existing signal
// for "we owe this family money back." A positive adjustment on a paid bill correctly reopens it
// (UNPAID/PARTIAL) rather than silently discarding the extra amount due.
export async function setBillingAdjustment(id: string, data: BillingAdjustmentInput) {
  await requireAdmin();
  id = idSchema.parse(id);
  data = billingAdjustmentSchema.parse(data);
  const updated = await serializableTransaction(async (tx) => {
    const billing = await tx.monthlyStudentBilling.findUniqueOrThrow({ where: { id } });

    const baseTuition = Number(billing.baseTuition);
    const subtotalBeforeAdjustment = round2(
      baseTuition - Number(billing.multiClassDiscount) - Number(billing.siblingDiscount),
    );
    const finalAmountDue = round2(subtotalBeforeAdjustment + data.adjustment);
    const amountPaid = Number(billing.amountPaid);
    const status = computeBillingStatus(finalAmountDue, amountPaid);

    return tx.monthlyStudentBilling.update({
      where: { id },
      data: {
        adjustment: data.adjustment,
        adjustmentNotes: data.adjustmentNotes || null,
        finalAmountDue,
        balance: round2(finalAmountDue - amountPaid),
        status,
      },
    });
  });
  if (Number(updated.balance) < 0) {
    const billing = await db.monthlyStudentBilling.findUniqueOrThrow({
      where: { id }, include: { student: { include: { family: true } } },
    });
    await sendAdminOperationalAlert({
      setting: "creditAlertEnabled",
      subject: `Credit requires review — ${billing.student.family.familyName}`,
      lines: [`Student: ${billing.student.fullName}`, `Credit balance: $${Math.abs(Number(updated.balance)).toFixed(2)}`],
    });
  }
  return updated;
}

// Only safe before any payment exists — pulls in the latest ClassMonthlyFee amounts and
// re-runs the discount calc, but preserves the existing adjustment (§4.4: a one-bill change,
// never reset by a fee update elsewhere).
export async function recalculateBilling(id: string) {
  await requireAdmin();
  id = idSchema.parse(id);
  const multiClassDiscountPct = await getMultiClassDiscountPct();
  const siblingDiscountPct = await getSiblingDiscountPct();

  return serializableTransaction(async (tx) => {
    const billing = await tx.monthlyStudentBilling.findUniqueOrThrow({ where: { id }, include: { payments: true } });
    if (billing.payments.length > 0) {
      throw new Error("This bill has payments recorded against it and can no longer be recalculated.");
    }

    const student = await tx.student.findUniqueOrThrow({ where: { id: billing.studentId } });
    const siblingCount = await familyQualifyingSiblingCount(tx, student.familyId, billing.month);
    const lineItemInputs = await buildLineItemInputs(tx, student.id, billing.month);

    const computed = computeStudentBilling({
      lineItems: lineItemInputs,
      hasSiblingDiscount: siblingCount >= 2,
      adjustment: Number(billing.adjustment),
      multiClassDiscountPct,
      siblingDiscountPct,
    });
    const status = computeBillingStatus(computed.finalAmountDue, 0);

    const updated = await tx.monthlyStudentBilling.update({
      where: { id },
      data: {
        baseTuition: computed.baseTuition,
        multiClassDiscount: computed.multiClassDiscount,
        siblingDiscount: computed.siblingDiscount,
        finalAmountDue: computed.finalAmountDue,
        balance: computed.finalAmountDue,
        status,
      },
    });

    await tx.monthlyBillingLineItem.deleteMany({ where: { billingId: id } });
    if (lineItemInputs.length > 0) {
      await tx.monthlyBillingLineItem.createMany({
        data: lineItemInputs.map((li) => ({
          billingId: id,
          enrollmentId: li.enrollmentId,
          classMonthlyFeeId: li.classMonthlyFeeId,
          amount: li.amount,
        })),
      });
    }

    return updated;
  });
}
