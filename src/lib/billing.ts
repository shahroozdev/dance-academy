import { isAfter, isBefore } from "date-fns";

export type BillingStatusValue = "UNPAID" | "PARTIAL" | "PAID" | "OVERPAID";

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

// ---------- Month / date-overlap helpers (docs/04-business-logic-billing-discounts.md §4.2) ----------
//
// "Month" is a calendar concept, not a moment in wall-clock time, so every month boundary here is
// pinned to UTC rather than the server's local timezone. date-fns's startOfMonth/endOfMonth read
// local calendar fields — on a server west of UTC, startOfMonth(new Date("2026-09-01")) resolves
// to August, not September. isAfter/isBefore stay from date-fns since they only compare absolute
// instants, which is timezone-safe.

function startOfMonthUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function endOfMonthUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
}

export function normalizeMonth(input: Date | string): Date {
  return startOfMonthUTC(typeof input === "string" ? new Date(input) : input);
}

export function enrollmentOverlapsMonth(
  enrollment: { startDate: Date; endDate: Date | null },
  month: Date,
): boolean {
  const monthStart = startOfMonthUTC(month);
  const monthEnd = endOfMonthUTC(month);
  const startsByMonthEnd = !isAfter(enrollment.startDate, monthEnd);
  const endsNoEarlierThanMonthStart = enrollment.endDate === null || !isBefore(enrollment.endDate, monthStart);
  return startsByMonthEnd && endsNoEarlierThanMonthStart;
}

const DAY_OF_WEEK_INDEX: Record<string, number> = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

// Default billable-session count for a newly generated month: how many times the class's
// weekday falls in that month. The admin can override the result on the ClassMonthlyFee row
// for cancellations/holidays/extra sessions (§5).
export function countWeekdayOccurrencesInMonth(month: Date, dayOfWeek: string): number {
  const targetIndex = DAY_OF_WEEK_INDEX[dayOfWeek];
  if (targetIndex === undefined) return 4; // no schedule set — a reasonable default, admin can override

  const start = startOfMonthUTC(month);
  const end = endOfMonthUTC(month);
  let count = 0;
  for (let t = start.getTime(); t <= end.getTime(); t += 24 * 60 * 60 * 1000) {
    if (new Date(t).getUTCDay() === targetIndex) count++;
  }
  return count;
}

// ---------- computeStudentBilling — the single code path for a Final Amount Due ----------
// Calculation order is pinned to the requirements doc's worked examples (§7); reverse-engineered
// and documented in docs/04-business-logic-billing-discounts.md §4.1. Every caller (monthly
// generation job, manual regenerate, adjustment save) must go through this function — never
// duplicate this math elsewhere.

export type ClassFeeLineItem = {
  enrollmentId: string;
  classMonthlyFeeId: string;
  amount: number;
  discountEligible: boolean;
};

export type ComputeStudentBillingInput = {
  lineItems: ClassFeeLineItem[];
  hasSiblingDiscount: boolean;
  adjustment?: number;
  multiClassDiscountPct?: number;
  siblingDiscountPct?: number;
};

export type ComputeStudentBillingResult = {
  baseTuition: number;
  multiClassDiscount: number;
  siblingDiscount: number;
  adjustment: number;
  finalAmountDue: number;
};

export function computeStudentBilling({
  lineItems,
  hasSiblingDiscount,
  adjustment = 0,
  multiClassDiscountPct = 0.05,
  siblingDiscountPct = 0.05,
}: ComputeStudentBillingInput): ComputeStudentBillingResult {
  const baseTuition = round2(lineItems.reduce((sum, li) => sum + li.amount, 0));

  const discountEligibleLineItems = lineItems.filter((li) => li.discountEligible);
  const discountEligibleSubtotal = round2(
    discountEligibleLineItems.reduce((sum, li) => sum + li.amount, 0),
  );
  const multiClassDiscount =
    discountEligibleLineItems.length >= 2 ? round2(discountEligibleSubtotal * multiClassDiscountPct) : 0;

  const subtotalA = round2(baseTuition - multiClassDiscount);
  const siblingDiscount = hasSiblingDiscount ? round2(subtotalA * siblingDiscountPct) : 0;
  const subtotalB = round2(subtotalA - siblingDiscount);

  const finalAmountDue = round2(subtotalB + adjustment);

  return {
    baseTuition,
    multiClassDiscount,
    siblingDiscount,
    adjustment: round2(adjustment),
    finalAmountDue,
  };
}

// ---------- Payment status derivation (§10) ----------

export function computeBillingStatus(finalAmountDue: number, amountPaid: number): BillingStatusValue {
  const balance = round2(finalAmountDue - amountPaid);
  if (balance < 0) return "OVERPAID";
  if (balance === 0) return "PAID";
  return amountPaid > 0 ? "PARTIAL" : "UNPAID";
}
