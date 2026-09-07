import { addDays, isAfter, isBefore } from "date-fns";

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
  const date = typeof input === "string" ? new Date(input) : input;
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) throw new Error("Enter a valid billing month.");
  return startOfMonthUTC(date);
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
  return countWeekdayOccurrencesInRange(dayOfWeek, startOfMonthUTC(month), endOfMonthUTC(month));
}

// Same weekday-count as above, but over an arbitrary date range rather than a whole month —
// used to prorate a mid-month enrollment's charge (§4.7). No "default to 4" fallback here:
// that's a whole-month heuristic that isn't meaningful for a partial range.
export function countWeekdayOccurrencesInRange(dayOfWeek: string, rangeStart: Date, rangeEnd: Date): number {
  const targetIndex = DAY_OF_WEEK_INDEX[dayOfWeek];
  if (targetIndex === undefined) return 0;
  let count = 0;
  for (let t = rangeStart.getTime(); t <= rangeEnd.getTime(); t += 24 * 60 * 60 * 1000) {
    if (new Date(t).getUTCDay() === targetIndex) count++;
  }
  return count;
}

function daysInclusiveUTC(start: Date, end: Date): number {
  // Truncate to the UTC calendar date first — end is typically end-of-day (23:59:59.999),
  // which would otherwise make the raw millisecond diff round up to one day too many.
  const startDay = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  const endDay = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
  return Math.round((endDay - startDay) / (24 * 60 * 60 * 1000)) + 1;
}

// ---------- Mid-month enrollment proration (§4.7) ----------
//
// A student who joins (or leaves) partway through the month must only be charged for the
// billable sessions that actually fall within their enrolled range that month — never the
// full month's session count.

export type ProratedLineItemInput = {
  month: Date;
  dayOfWeek: string | null;
  fullMonthAmount: number;
  perSessionRate: number | null;
  enrollmentStart: Date;
  enrollmentEnd: Date | null;
};

export function computeProratedLineItemAmount({
  month,
  dayOfWeek,
  fullMonthAmount,
  perSessionRate,
  enrollmentStart,
  enrollmentEnd,
}: ProratedLineItemInput): number {
  const monthStart = startOfMonthUTC(month);
  const monthEnd = endOfMonthUTC(month);
  const coversFullMonth =
    !isAfter(enrollmentStart, monthStart) && (enrollmentEnd === null || !isBefore(enrollmentEnd, monthEnd));
  if (coversFullMonth) return fullMonthAmount;

  const effectiveStart = isAfter(enrollmentStart, monthStart) ? enrollmentStart : monthStart;
  const effectiveEnd = enrollmentEnd !== null && isBefore(enrollmentEnd, monthEnd) ? enrollmentEnd : monthEnd;

  if (dayOfWeek && perSessionRate !== null) {
    const sessions = countWeekdayOccurrencesInRange(dayOfWeek, effectiveStart, effectiveEnd);
    return round2(sessions * perSessionRate);
  }

  // No per-session rate to count against (e.g. a fully flat-overridden fee) — fall back to a
  // calendar-day ratio of the full-month amount.
  const totalDays = daysInclusiveUTC(monthStart, monthEnd);
  const activeDays = daysInclusiveUTC(effectiveStart, effectiveEnd);
  return round2((fullMonthAmount * activeDays) / totalDays);
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

  // Discount-ineligible line items (e.g. seasonal/special-program charges) must never
  // contribute to, or receive, either discount — both discounts are computed purely over the
  // eligible subtotal, and the ineligible amount is added back untouched afterward.
  const discountEligibleLineItems = lineItems.filter((li) => li.discountEligible);
  const discountEligibleSubtotal = round2(
    discountEligibleLineItems.reduce((sum, li) => sum + li.amount, 0),
  );
  const discountIneligibleSubtotal = round2(baseTuition - discountEligibleSubtotal);

  const multiClassDiscount =
    discountEligibleLineItems.length >= 2 ? round2(discountEligibleSubtotal * multiClassDiscountPct) : 0;

  const subtotalA = round2(discountEligibleSubtotal - multiClassDiscount);
  const siblingDiscount = hasSiblingDiscount ? round2(subtotalA * siblingDiscountPct) : 0;
  const subtotalB = round2(subtotalA - siblingDiscount);

  const finalAmountDue = round2(subtotalB + discountIneligibleSubtotal + adjustment);

  return {
    baseTuition,
    multiClassDiscount,
    siblingDiscount,
    adjustment: round2(adjustment),
    finalAmountDue,
  };
}

// ---------- Payment reminders (§5.4) ----------

// A bill's due date is `dueDayOfMonth` of its billing month, pinned to UTC for the same reason
// month boundaries are above — a server west of UTC must not shift which calendar day this lands on.
export function computeDueDate(month: Date, dueDayOfMonth: number): Date {
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth(), dueDayOfMonth));
}

// True once a bill's due date has passed by at least `reminderDaysAfterDue` days, as of `now`
// (injected rather than read internally, so this stays pure/testable). Doesn't check bill
// status — callers combine this with `status IN (UNPAID, PARTIAL)`.
export function isPaymentReminderDue(
  month: Date,
  dueDayOfMonth: number,
  reminderDaysAfterDue: number,
  now: Date,
): boolean {
  const reminderDate = addDays(computeDueDate(month, dueDayOfMonth), reminderDaysAfterDue);
  return !isBefore(now, reminderDate);
}

// ---------- Payment status derivation (§10) ----------

export function computeBillingStatus(finalAmountDue: number, amountPaid: number): BillingStatusValue {
  const balance = round2(finalAmountDue - amountPaid);
  if (balance < 0) return "OVERPAID";
  if (balance === 0) return "PAID";
  return amountPaid > 0 ? "PARTIAL" : "UNPAID";
}
