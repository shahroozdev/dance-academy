import "server-only";
import { serializableTransaction } from "@/actions/transaction";
import type { Class, Prisma } from "@/generated/prisma/client";
import {
  computeBillingStatus,
  computeProratedLineItemAmount,
  computeStudentBilling,
  countWeekdayOccurrencesInMonth,
  enrollmentOverlapsMonth,
  normalizeMonth,
  round2,
} from "@/lib/billing";
import type { ClassFeeLineItem } from "@/lib/billing";
import { db } from "@/lib/db";
import { getMultiClassDiscountPct, getSiblingDiscountPct } from "@/lib/settings";

type LineItemInput = ClassFeeLineItem;

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

export async function familyQualifyingSiblingCount(
  tx: Prisma.TransactionClient,
  familyId: string,
  month: Date,
): Promise<number> {
  const students = await tx.student.findMany({
    where: { familyId, isActive: true },
    include: { enrollments: true },
  });
  return students.filter((s) => s.enrollments.some((e) => enrollmentOverlapsMonth(e, month))).length;
}

export async function buildLineItemInputs(
  tx: Prisma.TransactionClient,
  studentId: string,
  month: Date,
): Promise<LineItemInput[]> {
  const enrollments = await tx.enrollment.findMany({
    where: { studentId },
    include: { class: true },
    orderBy: { startDate: "asc" },
  });
  const overlapping = enrollments.filter((e) => enrollmentOverlapsMonth(e, month));

  const lineItems: LineItemInput[] = [];
  const billedClasses = new Set<string>();
  for (const enrollment of overlapping) {
    // Rejoining the same class (or legacy duplicate enrollments) must not charge its monthly fee twice.
    if (billedClasses.has(enrollment.classId)) continue;
    billedClasses.add(enrollment.classId);

    // Seasonal/special-program fees are charged exactly once per enrollment, ever — never
    // recreated on a later month's run just because the enrollment still overlaps it.
    if (enrollment.class.pricingType === "SEASONAL") {
      const alreadyCharged = await tx.monthlyBillingLineItem.findFirst({
        where: {
          enrollmentId: enrollment.id,
          classMonthlyFee: { classId: enrollment.classId },
          billing: { month: { not: month } },
        },
      });
      if (alreadyCharged) continue;
    }

    const fee = await getOrCreateClassMonthlyFee(tx, enrollment.class, month);
    const amount =
      enrollment.class.pricingType === "SEASONAL"
        ? Number(fee.monthlyClassFee)
        : computeProratedLineItemAmount({
            month,
            dayOfWeek: enrollment.class.dayOfWeek,
            fullMonthAmount: Number(fee.monthlyClassFee),
            perSessionRate: fee.rate === null ? null : Number(fee.rate),
            enrollmentStart: enrollment.startDate,
            enrollmentEnd: enrollment.endDate,
          });
    lineItems.push({
      enrollmentId: enrollment.id,
      classMonthlyFeeId: fee.id,
      amount,
      // Seasonal/special-program charges never receive (or count toward) either discount —
      // enforced here regardless of the admin-set Class.discountEligible flag.
      discountEligible: enrollment.class.discountEligible && enrollment.class.pricingType !== "SEASONAL",
    });
  }
  return lineItems;
}

// ---------- Billing finalization gate (§4.7 / §5) ----------
//
// Returns the distinct class names whose ClassMonthlyFee for this billing period hasn't been
// finalized yet — an empty array means every notification action for these bills is clear to
// send. Callers pass the MonthlyStudentBilling ids of the bill(s) they're about to notify about.
async function findUnfinalizedLineItems(billingIds: string[]) {
  if (billingIds.length === 0) return [];
  return db.monthlyBillingLineItem.findMany({
    where: { billingId: { in: billingIds }, classMonthlyFee: { isFinalized: false } },
    include: { classMonthlyFee: { include: { class: { select: { name: true } } } } },
  });
}

export async function getUnfinalizedClasses(billingIds: string[]): Promise<string[]> {
  const lineItems = await findUnfinalizedLineItems(billingIds);
  return [...new Set(lineItems.map((li) => li.classMonthlyFee.class.name))];
}

// The subset of the given billing ids that have at least one line item tied to a class whose
// fee for this month hasn't been finalized — used by bulk/cron send paths to silently skip
// not-yet-ready bills rather than throwing.
export async function getUnfinalizedBillingIds(billingIds: string[]): Promise<Set<string>> {
  const lineItems = await findUnfinalizedLineItems(billingIds);
  return new Set(lineItems.map((li) => li.billingId));
}

// Throws with a clear, actionable message for the single-family/manual send actions. Bulk/cron
// send paths should call getUnfinalizedClasses directly and silently skip instead — an unfinalized
// bill just stays eligible for the next run, same as any other "not ready yet" case.
export async function assertFinalizedForNotification(billingIds: string[]): Promise<void> {
  const unfinalized = await getUnfinalizedClasses(billingIds);
  if (unfinalized.length > 0) {
    throw new Error(
      `Finalize this month's billable session count for ${unfinalized.join(", ")} on the Class Monthly Fees page before sending.`,
    );
  }
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
  const multiClassDiscountPct = await getMultiClassDiscountPct();
  const siblingDiscountPct = await getSiblingDiscountPct();

  return serializableTransaction(
    async (tx) => {
      const candidates = await tx.student.findMany({
        where: { isActive: true, enrollments: { some: {} } },
        include: { enrollments: true },
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
  );
}
