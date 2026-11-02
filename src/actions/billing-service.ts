import "server-only";
import { serializableTransaction } from "@/actions/transaction";
import type { Class, Prisma } from "@/generated/prisma/client";
import {
  computeBillingStatus,
  classIsBillableForMonth,
  computeClassMonthAmount,
  computeStudentBilling,
  countClassSessionsForMonth,
  enrollmentIsBillableForMonth,
  enrollmentOverlapsMonth,
  mergeBillableRanges,
  normalizeMonth,
  round2,
} from "@/lib/billing";
import type { ClassFeeLineItem } from "@/lib/billing";
import { db } from "@/lib/db";
import { enrollmentCalendarDate } from "@/lib/enrollment-date";
import { getMultiClassDiscountPct, getSiblingDiscountPct } from "@/lib/settings";

type LineItemInput = ClassFeeLineItem & { classId: string };

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

  const billableSessions = countClassSessionsForMonth(month, cls.dayOfWeek, cls.firstClassDate, cls.lastClassDate);
  const rate = round2(Number(cls.standardRate));
  const monthlyClassFee = round2(billableSessions * rate);
  return tx.classMonthlyFee.create({
    data: { classId: cls.id, month, billableSessions, rate, monthlyClassFee },
  });
}

// A student counts toward the family's sibling discount for a month when they had a billable
// enrollment that month. Deactivation ends enrollments on the exact last class date, so a
// sibling who has since left still counts for the months they attended — bills for those months
// keep their discount when recalculated later. An inactive student's enrollment without an end
// date is incomplete data and never extends the discount.
export async function familyQualifyingSiblingCount(
  tx: Prisma.TransactionClient,
  familyId: string,
  month: Date,
): Promise<number> {
  const students = await tx.student.findMany({
    where: { familyId },
    include: {
      enrollments: {
        include: { billingPauses: true, class: { include: { billingPauses: true } } },
      },
    },
  });
  return students.filter((s) =>
    s.enrollments.some((e) => (s.isActive || e.endDate !== null) && enrollmentIsBillableForMonth(e, month)),
  ).length;
}

export async function buildLineItemInputs(
  tx: Prisma.TransactionClient,
  studentId: string,
  month: Date,
): Promise<LineItemInput[]> {
  const enrollments = await tx.enrollment.findMany({
    where: { studentId },
    include: { class: { include: { billingPauses: true } }, billingPauses: true },
    orderBy: { startDate: "asc" },
  });
  // A re-enrollment is a second row for the same class. Every billable period of one class is
  // combined into a single line so the class is charged once, for all of its sessions.
  const periodsByClass = new Map<string, typeof enrollments>();
  for (const enrollment of enrollments.filter((e) => enrollmentIsBillableForMonth(e, month))) {
    periodsByClass.set(enrollment.classId, [...(periodsByClass.get(enrollment.classId) ?? []), enrollment]);
  }

  const monthStart = normalizeMonth(month);
  const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 1));
  const lineItems: LineItemInput[] = [];
  for (const [classId, periods] of periodsByClass) {
    const cls = periods[0].class;
    const classStart = enrollmentCalendarDate(cls.firstClassDate);
    const ranges = mergeBillableRanges(periods.map((enrollment) => {
      const start = enrollmentCalendarDate(enrollment.startDate);
      return { start: start > classStart ? start : classStart, end: enrollment.endDate };
    }));
    const fee = await getOrCreateClassMonthlyFee(tx, cls, month);
    let baseAmount = 0;
    if (cls.pricingType === "SEASONAL") {
      // Charged exactly once per student and class, whichever enrollment row carries it. This
      // month's own line is excluded so it is kept, while a charge in any other month — earlier
      // or later — stops a recalculation from billing the fee a second time.
      const chargedElsewhere = await tx.monthlyBillingLineItem.findFirst({
        where: { classMonthlyFee: { classId }, billing: { studentId, month: { not: month } } },
      });
      baseAmount = chargedElsewhere ? 0 : Number(fee.monthlyClassFee);
    } else {
      baseAmount = computeClassMonthAmount({
        month,
        dayOfWeek: cls.dayOfWeek,
        fullMonthAmount: Number(fee.monthlyClassFee),
        perSessionRate: fee.rate === null ? null : Number(fee.rate),
        ranges,
        classLastDate: cls.lastClassDate,
      });
    }
    // Rehearsals are charged only to students enrolled on the rehearsal date.
    const extraSessions = await tx.classExtraSession.findMany({
      where: {
        classId,
        OR: ranges.map((range) => ({
          sessionDate: {
            gte: range.start > monthStart ? range.start : monthStart,
            lt: monthEnd,
            ...(range.end && { lte: range.end }),
          },
        })),
      },
      select: { amount: true },
    });
    const amount = round2(
      baseAmount + extraSessions.reduce((sum, session) => sum + Number(session.amount), 0),
    );
    if (amount === 0) continue;
    lineItems.push({
      classId,
      enrollmentId: periods[0].id,
      classMonthlyFeeId: fee.id,
      amount,
      // Seasonal/special-program charges never receive (or count toward) either discount —
      // enforced here regardless of the admin-set Class.discountEligible flag.
      discountEligible: cls.discountEligible && cls.pricingType !== "SEASONAL",
    });
  }
  return lineItems;
}

type DiscountRates = { multiClassDiscountPct: number; siblingDiscountPct: number };

export async function getDiscountRates(): Promise<DiscountRates> {
  return { multiClassDiscountPct: await getMultiClassDiscountPct(), siblingDiscountPct: await getSiblingDiscountPct() };
}

// The one place a monthly bill is (re)built: class lines and discounts are refreshed from the
// current enrollment, class, and fee data; the adjustment is kept; every payment ledger entry is
// left untouched and summed back into the paid amount, balance, and status. Returns null when
// there is no bill and nothing to charge, so empty $0 bills are never created.
export async function recomputeStudentMonthBill(
  tx: Prisma.TransactionClient,
  { studentId, familyId, month }: { studentId: string; familyId: string; month: Date },
  rates: DiscountRates,
  { clearReview }: { clearReview: boolean },
) {
  const existing = await tx.monthlyStudentBilling.findUnique({
    where: { studentId_month: { studentId, month } },
    include: { payments: { select: { amount: true, classId: true, class: { select: { name: true } } } } },
  });
  const lineItemInputs = await buildLineItemInputs(tx, studentId, month);
  if (!existing && lineItemInputs.length === 0) return null;

  const siblingCount = await familyQualifyingSiblingCount(tx, familyId, month);
  const computed = computeStudentBilling({
    lineItems: lineItemInputs,
    hasSiblingDiscount: siblingCount >= 2,
    adjustment: existing ? Number(existing.adjustment) : 0,
    ...rates,
  });
  const payments = existing?.payments ?? [];
  const amountPaid = round2(payments.reduce((sum, payment) => sum + Number(payment.amount), 0));
  const balance = round2(computed.finalAmountDue - amountPaid);
  const status = computeBillingStatus(computed.finalAmountDue, amountPaid);

  // A payment recorded against a class that is no longer charged on this bill is kept as-is, but
  // the bill is flagged so staff decide where that money belongs.
  const billedClassIds = new Set(lineItemInputs.map((lineItem) => lineItem.classId));
  const strandedClasses = [...new Set(payments
    .filter((payment) => payment.classId && !billedClassIds.has(payment.classId))
    .map((payment) => payment.class?.name ?? "a removed class"))];
  const review = strandedClasses.length > 0
    ? {
        needsManualReview: true,
        manualReviewReason: `A payment is assigned to ${strandedClasses.join(", ")}, which is no longer charged on this bill. Review which class or month the payment belongs to.`,
        manualReviewAt: new Date(),
      }
    : clearReview && { needsManualReview: false, manualReviewReason: null, manualReviewAt: null };

  const amounts = {
    baseTuition: computed.baseTuition,
    multiClassDiscount: computed.multiClassDiscount,
    siblingDiscount: computed.siblingDiscount,
    finalAmountDue: computed.finalAmountDue,
    amountPaid,
    balance,
    status,
  };
  const billing = await tx.monthlyStudentBilling.upsert({
    where: { studentId_month: { studentId, month } },
    create: { studentId, month, adjustment: computed.adjustment, ...amounts, ...review },
    update: { ...amounts, ...review },
  });
  await tx.monthlyBillingLineItem.deleteMany({ where: { billingId: billing.id } });
  if (lineItemInputs.length > 0) {
    await tx.monthlyBillingLineItem.createMany({
      data: lineItemInputs.map((lineItem) => ({
        billingId: billing.id,
        enrollmentId: lineItem.enrollmentId,
        classMonthlyFeeId: lineItem.classMonthlyFeeId,
        amount: lineItem.amount,
      })),
    });
  }
  return { billing, created: !existing };
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

// ---------- Monthly generation job (§4.5) — idempotent, preserves payment ledger entries ----------

export type GenerateMonthlyBillingSummary = {
  month: string;
  created: number;
  updated: number;
  skipped: number;
  students: { studentId: string; studentName: string; result: "created" | "updated" | "skipped" }[];
};

export async function generateMonthlyBilling(monthInput: string): Promise<GenerateMonthlyBillingSummary> {
  const month = normalizeMonth(monthInput);
  const rates = await getDiscountRates();
  const candidates = await db.student.findMany({
    where: {
      isActive: true,
      OR: [
        { enrollments: { some: {} } },
        { monthlyBillings: { some: { month } } },
      ],
    },
    select: {
      id: true,
      fullName: true,
      familyId: true,
      enrollments: { select: { startDate: true, endDate: true, class: { select: { firstClassDate: true, inactiveFromMonth: true, lastClassDate: true } } } },
      monthlyBillings: { where: { month }, select: { id: true } },
    },
  });
  const eligibleStudents = candidates.filter((student) => student.enrollments.some(
    (enrollment) =>
      enrollmentOverlapsMonth(enrollment, month) &&
      classIsBillableForMonth(enrollment.class, month),
  ) || student.monthlyBillings.length > 0);

  // Existing bills are rebuilt too — skipping a non-zero or paid bill let later enrollment,
  // class-status, or session-count corrections leave only part of the month represented.
  // Review flags are left for staff; payment ledger entries are never deleted or reassigned.
  const students: GenerateMonthlyBillingSummary["students"] = [];
  for (const student of eligibleStudents) {
    const outcome = await serializableTransaction((tx) => recomputeStudentMonthBill(
      tx,
      { studentId: student.id, familyId: student.familyId, month },
      rates,
      { clearReview: false },
    ));
    const summary = { studentId: student.id, studentName: student.fullName };
    if (!outcome) {
      students.push({ ...summary, result: "skipped" });
      continue;
    }
    students.push({ ...summary, result: outcome.created ? "created" : "updated" });
  }
  return {
    month: month.toISOString(),
    created: students.filter((student) => student.result === "created").length,
    updated: students.filter((student) => student.result === "updated").length,
    skipped: students.filter((student) => student.result === "skipped").length,
    students,
  };
}
