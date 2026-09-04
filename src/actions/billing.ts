"use server";

import type { BillingAdjustmentInput } from "@/actions/billing.schema";
import type { Class, Prisma } from "@/generated/prisma/client";
import {
  computeBillingStatus,
  computeStudentBilling,
  countWeekdayOccurrencesInMonth,
  enrollmentOverlapsMonth,
  normalizeMonth,
  round2,
} from "@/lib/billing";
import { db } from "@/lib/db";
import { getMultiClassDiscountPct, getSiblingDiscountPct } from "@/lib/settings";

type LineItemInput = {
  enrollmentId: string;
  classMonthlyFeeId: string;
  amount: number;
  discountEligible: boolean;
};

// Get-or-create this class's fee row for this month. Once created, a fee never changes on its
// own — see docs/04 §4.3 — the admin overrides it explicitly via /admin/class-fees.
async function getOrCreateClassMonthlyFee(tx: Prisma.TransactionClient, cls: Class, month: Date) {
  const existing = await tx.classMonthlyFee.findUnique({
    where: { classId_month: { classId: cls.id, month } },
  });
  if (existing) return existing;

  if (cls.pricingType === "SEASONAL") {
    const flatFee = round2(Number(cls.standardRate));
    return tx.classMonthlyFee.create({
      data: { classId: cls.id, month, flatFee, monthlyClassFee: flatFee },
    });
  }

  const billableSessions = cls.dayOfWeek ? countWeekdayOccurrencesInMonth(month, cls.dayOfWeek) : 4;
  const rate = round2(Number(cls.standardRate));
  const monthlyClassFee = round2(billableSessions * rate);
  return tx.classMonthlyFee.create({
    data: { classId: cls.id, month, billableSessions, rate, monthlyClassFee },
  });
}

async function familyQualifyingSiblingCount(
  tx: Prisma.TransactionClient,
  familyId: string,
  month: Date,
): Promise<number> {
  const students = await tx.student.findMany({
    where: { familyId, isActive: true },
    include: { enrollments: { where: { status: "ACTIVE" } } },
  });
  return students.filter((s) => s.enrollments.some((e) => enrollmentOverlapsMonth(e, month))).length;
}

async function buildLineItemInputs(
  tx: Prisma.TransactionClient,
  studentId: string,
  month: Date,
): Promise<LineItemInput[]> {
  const enrollments = await tx.enrollment.findMany({
    where: { studentId, status: "ACTIVE" },
    include: { class: true },
  });
  const overlapping = enrollments.filter((e) => enrollmentOverlapsMonth(e, month));

  const lineItems: LineItemInput[] = [];
  for (const enrollment of overlapping) {
    const fee = await getOrCreateClassMonthlyFee(tx, enrollment.class, month);
    lineItems.push({
      enrollmentId: enrollment.id,
      classMonthlyFeeId: fee.id,
      amount: Number(fee.monthlyClassFee),
      discountEligible: enrollment.class.discountEligible,
    });
  }
  return lineItems;
}

// ---------- Monthly generation job (§4.5) — idempotent, never overwrites a bill with payments ----------

export type GenerateMonthlyBillingSummary = {
  month: string;
  created: number;
  updated: number;
  skipped: number;
  students: { studentId: string; studentName: string; result: "created" | "updated" | "skipped" }[];
};

export async function generateMonthlyBilling(monthInput: string): Promise<GenerateMonthlyBillingSummary> {
  const month = normalizeMonth(monthInput);
  const multiClassDiscountPct = getMultiClassDiscountPct();
  const siblingDiscountPct = getSiblingDiscountPct();

  return db.$transaction(
    async (tx) => {
      const candidates = await tx.student.findMany({
        where: { isActive: true, enrollments: { some: { status: "ACTIVE" } } },
        include: { enrollments: { where: { status: "ACTIVE" } } },
      });
      const eligibleStudents = candidates.filter((s) => s.enrollments.some((e) => enrollmentOverlapsMonth(e, month)));

      const siblingCountCache = new Map<string, number>();
      const summary: GenerateMonthlyBillingSummary["students"] = [];
      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const student of eligibleStudents) {
        if (!siblingCountCache.has(student.familyId)) {
          siblingCountCache.set(student.familyId, await familyQualifyingSiblingCount(tx, student.familyId, month));
        }
        const hasSiblingDiscount = (siblingCountCache.get(student.familyId) ?? 0) >= 2;

        const existing = await tx.monthlyStudentBilling.findUnique({
          where: { studentId_month: { studentId: student.id, month } },
          include: { payments: true },
        });

        if (existing && (existing.status !== "UNPAID" || existing.payments.length > 0)) {
          skipped++;
          summary.push({ studentId: student.id, studentName: student.fullName, result: "skipped" });
          continue;
        }

        const lineItemInputs = await buildLineItemInputs(tx, student.id, month);
        const computed = computeStudentBilling({
          lineItems: lineItemInputs,
          hasSiblingDiscount,
          adjustment: existing ? Number(existing.adjustment) : 0,
          multiClassDiscountPct,
          siblingDiscountPct,
        });
        const status = computeBillingStatus(computed.finalAmountDue, 0);

        const billing = await tx.monthlyStudentBilling.upsert({
          where: { studentId_month: { studentId: student.id, month } },
          create: {
            studentId: student.id,
            month,
            baseTuition: computed.baseTuition,
            multiClassDiscount: computed.multiClassDiscount,
            siblingDiscount: computed.siblingDiscount,
            adjustment: computed.adjustment,
            finalAmountDue: computed.finalAmountDue,
            amountPaid: 0,
            balance: computed.finalAmountDue,
            status,
          },
          update: {
            baseTuition: computed.baseTuition,
            multiClassDiscount: computed.multiClassDiscount,
            siblingDiscount: computed.siblingDiscount,
            finalAmountDue: computed.finalAmountDue,
            balance: computed.finalAmountDue,
            status,
          },
        });

        await tx.monthlyBillingLineItem.deleteMany({ where: { billingId: billing.id } });
        if (lineItemInputs.length > 0) {
          await tx.monthlyBillingLineItem.createMany({
            data: lineItemInputs.map((li) => ({
              billingId: billing.id,
              enrollmentId: li.enrollmentId,
              classMonthlyFeeId: li.classMonthlyFeeId,
              amount: li.amount,
            })),
          });
        }

        if (existing) {
          updated++;
          summary.push({ studentId: student.id, studentName: student.fullName, result: "updated" });
        } else {
          created++;
          summary.push({ studentId: student.id, studentName: student.fullName, result: "created" });
        }
      }

      return { month: month.toISOString(), created, updated, skipped, students: summary };
    },
    { timeout: 30000 },
  );
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

export async function setBillingAdjustment(id: string, data: BillingAdjustmentInput) {
  const billing = await db.monthlyStudentBilling.findUniqueOrThrow({ where: { id } });
  if (billing.status === "PAID") {
    throw new Error("This bill is fully paid. Reopen it before changing the adjustment.");
  }

  const baseTuition = Number(billing.baseTuition);
  const subtotalBeforeAdjustment = round2(
    baseTuition - Number(billing.multiClassDiscount) - Number(billing.siblingDiscount),
  );
  const finalAmountDue = round2(subtotalBeforeAdjustment + data.adjustment);
  const amountPaid = Number(billing.amountPaid);
  const status = computeBillingStatus(finalAmountDue, amountPaid);

  return db.monthlyStudentBilling.update({
    where: { id },
    data: {
      adjustment: data.adjustment,
      adjustmentNotes: data.adjustmentNotes || null,
      finalAmountDue,
      balance: round2(finalAmountDue - amountPaid),
      status,
    },
  });
}

// Only safe before any payment exists — pulls in the latest ClassMonthlyFee amounts and
// re-runs the discount calc, but preserves the existing adjustment (§4.4: a one-bill change,
// never reset by a fee update elsewhere).
export async function recalculateBilling(id: string) {
  return db.$transaction(async (tx) => {
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
      multiClassDiscountPct: getMultiClassDiscountPct(),
      siblingDiscountPct: getSiblingDiscountPct(),
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
