import { describe, expect, it } from "vitest";

import {
  computeBillingStatus,
  computeDueDate,
  computeProratedLineItemAmount,
  computeStudentBilling,
  countWeekdayOccurrencesInMonth,
  countWeekdayOccurrencesInRange,
  enrollmentOverlapsMonth,
  isPaymentReminderDue,
  normalizeMonth,
} from "@/lib/billing";

// Worked cases mirror docs/04-business-logic-billing-discounts.md §4.6, which mirrors the
// requirements doc's own §7 examples (Nia/Leia) and §16's required test matrix.
describe("computeStudentBilling", () => {
  it("one-class student, only child — no discounts", () => {
    const result = computeStudentBilling({
      lineItems: [{ enrollmentId: "e1", classMonthlyFeeId: "f1", amount: 80, discountEligible: true }],
      hasSiblingDiscount: false,
    });
    expect(result).toEqual({
      baseTuition: 80,
      multiClassDiscount: 0,
      siblingDiscount: 0,
      adjustment: 0,
      finalAmountDue: 80,
    });
  });

  it("multi-class student, only child — multi-class discount only", () => {
    const result = computeStudentBilling({
      lineItems: [
        { enrollmentId: "e1", classMonthlyFeeId: "f1", amount: 80, discountEligible: true },
        { enrollmentId: "e2", classMonthlyFeeId: "f2", amount: 80, discountEligible: true },
      ],
      hasSiblingDiscount: false,
    });
    expect(result.baseTuition).toBe(160);
    expect(result.multiClassDiscount).toBe(8);
    expect(result.siblingDiscount).toBe(0);
    expect(result.finalAmountDue).toBe(152);
  });

  it("single-class sibling — sibling discount only", () => {
    const result = computeStudentBilling({
      lineItems: [{ enrollmentId: "e1", classMonthlyFeeId: "f1", amount: 80, discountEligible: true }],
      hasSiblingDiscount: true,
    });
    expect(result.multiClassDiscount).toBe(0);
    expect(result.siblingDiscount).toBe(4);
    expect(result.finalAmountDue).toBe(76);
  });

  it("Nia — 2 classes + sibling discount, both apply, matches the doc's worked example exactly", () => {
    const result = computeStudentBilling({
      lineItems: [
        { enrollmentId: "e1", classMonthlyFeeId: "f1", amount: 80, discountEligible: true },
        { enrollmentId: "e2", classMonthlyFeeId: "f2", amount: 80, discountEligible: true },
      ],
      hasSiblingDiscount: true,
    });
    expect(result.baseTuition).toBe(160);
    expect(result.multiClassDiscount).toBe(8);
    expect(result.siblingDiscount).toBe(7.6);
    expect(result.finalAmountDue).toBe(144.4);
  });

  it("Leia — 1 class + sibling discount + a cancelled-session adjustment, matches the doc exactly", () => {
    const result = computeStudentBilling({
      lineItems: [{ enrollmentId: "e1", classMonthlyFeeId: "f1", amount: 80, discountEligible: true }],
      hasSiblingDiscount: true,
      adjustment: -20,
    });
    expect(result.siblingDiscount).toBe(4);
    expect(result.finalAmountDue).toBe(56);
  });

  it("seasonal flat-fee class — a single line item flows straight through, unaffected by discount math", () => {
    const result = computeStudentBilling({
      lineItems: [{ enrollmentId: "e1", classMonthlyFeeId: "f1", amount: 45, discountEligible: true }],
      hasSiblingDiscount: false,
    });
    expect(result.finalAmountDue).toBe(45);
  });

  it("a non-discount-eligible class does not count toward the multi-class discount, but still bills", () => {
    const result = computeStudentBilling({
      lineItems: [
        { enrollmentId: "e1", classMonthlyFeeId: "f1", amount: 80, discountEligible: true },
        { enrollmentId: "e2", classMonthlyFeeId: "f2", amount: 45, discountEligible: false },
      ],
      hasSiblingDiscount: false,
    });
    expect(result.baseTuition).toBe(125);
    // Only one discount-eligible enrollment — multi-class discount needs 2+.
    expect(result.multiClassDiscount).toBe(0);
    expect(result.finalAmountDue).toBe(125);
  });

  it("a seasonal/ineligible charge is excluded from and unaffected by the sibling discount", () => {
    const result = computeStudentBilling({
      lineItems: [
        { enrollmentId: "e1", classMonthlyFeeId: "f1", amount: 80, discountEligible: true },
        { enrollmentId: "e2", classMonthlyFeeId: "f2", amount: 45, discountEligible: false },
      ],
      hasSiblingDiscount: true,
    });
    expect(result.baseTuition).toBe(125);
    // Sibling discount is 5% of the $80 regular-class subtotal only, not $125.
    expect(result.siblingDiscount).toBe(4);
    // 80 - 4 (sibling) + 45 (seasonal, untouched) = 121.
    expect(result.finalAmountDue).toBe(121);
  });

  it("seasonal + 2 regular classes — multi-class discount computed only on the regular subtotal", () => {
    const result = computeStudentBilling({
      lineItems: [
        { enrollmentId: "e1", classMonthlyFeeId: "f1", amount: 80, discountEligible: true },
        { enrollmentId: "e2", classMonthlyFeeId: "f2", amount: 80, discountEligible: true },
        { enrollmentId: "e3", classMonthlyFeeId: "f3", amount: 45, discountEligible: false },
      ],
      hasSiblingDiscount: true,
    });
    expect(result.baseTuition).toBe(205);
    expect(result.multiClassDiscount).toBe(8); // 5% of 160, not 205
    expect(result.siblingDiscount).toBe(7.6); // 5% of (160 - 8), matches the Nia example exactly
    // 160 - 8 - 7.6 + 45 (seasonal, untouched) = 189.4
    expect(result.finalAmountDue).toBe(189.4);
  });

  it("adjustment applies last, after both discounts", () => {
    const result = computeStudentBilling({
      lineItems: [
        { enrollmentId: "e1", classMonthlyFeeId: "f1", amount: 80, discountEligible: true },
        { enrollmentId: "e2", classMonthlyFeeId: "f2", amount: 80, discountEligible: true },
      ],
      hasSiblingDiscount: true,
      adjustment: 20,
    });
    // 160 - 8 (multi) = 152; 152 - 7.6 (sibling) = 144.4; 144.4 + 20 = 164.4
    expect(result.finalAmountDue).toBe(164.4);
  });
});

describe("computeBillingStatus", () => {
  it("partial payment", () => {
    expect(computeBillingStatus(100, 40)).toBe("PARTIAL");
  });

  it("full payment", () => {
    expect(computeBillingStatus(100, 100)).toBe("PAID");
  });

  it("overpayment", () => {
    expect(computeBillingStatus(100, 120)).toBe("OVERPAID");
  });

  it("no payment yet", () => {
    expect(computeBillingStatus(100, 0)).toBe("UNPAID");
  });
});

describe("normalizeMonth", () => {
  it("resolves 'YYYY-MM' input to UTC midnight on the 1st, independent of server timezone", () => {
    expect(normalizeMonth("2026-09").toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("resolves 'YYYY-MM-DD' input to the same UTC month start regardless of the day given", () => {
    expect(normalizeMonth("2026-09-15").toISOString()).toBe("2026-09-01T00:00:00.000Z");
  });

  it("is idempotent — normalizing an already-normalized month returns the same instant", () => {
    const once = normalizeMonth("2026-09-01");
    expect(normalizeMonth(once).toISOString()).toBe(once.toISOString());
  });
});

describe("enrollmentOverlapsMonth", () => {
  const sep2026 = normalizeMonth("2026-09-01");

  it("an enrollment that starts before and has no end date overlaps", () => {
    expect(enrollmentOverlapsMonth({ startDate: new Date("2026-01-01"), endDate: null }, sep2026)).toBe(true);
  });

  it("an enrollment that ended before the month starts does not overlap", () => {
    expect(enrollmentOverlapsMonth({ startDate: new Date("2026-01-01"), endDate: new Date("2026-08-15") }, sep2026)).toBe(
      false,
    );
  });

  it("an enrollment that starts after the month ends does not overlap", () => {
    expect(enrollmentOverlapsMonth({ startDate: new Date("2026-10-01"), endDate: null }, sep2026)).toBe(false);
  });

  it("an enrollment ending mid-month overlaps that month", () => {
    expect(enrollmentOverlapsMonth({ startDate: new Date("2026-01-01"), endDate: new Date("2026-09-14") }, sep2026)).toBe(
      true,
    );
  });
});

describe("countWeekdayOccurrencesInMonth", () => {
  it("counts every Tuesday in September 2026 (5: the 1st, 8th, 15th, 22nd, 29th)", () => {
    expect(countWeekdayOccurrencesInMonth(normalizeMonth("2026-09-01"), "TUESDAY")).toBe(5);
  });

  it("falls back to 4 when the class has no scheduled day", () => {
    expect(countWeekdayOccurrencesInMonth(normalizeMonth("2026-09-01"), "")).toBe(4);
  });
});

describe("countWeekdayOccurrencesInRange", () => {
  it("counts only the Tuesdays from the 10th onward in September 2026 (15th, 22nd, 29th)", () => {
    expect(
      countWeekdayOccurrencesInRange("TUESDAY", new Date("2026-09-10T00:00:00.000Z"), new Date("2026-09-30T23:59:59.999Z")),
    ).toBe(3);
  });

  it("returns 0 when no weekday is set", () => {
    expect(countWeekdayOccurrencesInRange("", new Date("2026-09-01"), new Date("2026-09-30"))).toBe(0);
  });
});

describe("computeProratedLineItemAmount — mid-month enrollment billing (§4.7)", () => {
  const september = normalizeMonth("2026-09-01");

  it("charges only for sessions from the enrollment's start date onward when joining mid-month", () => {
    const amount = computeProratedLineItemAmount({
      month: september,
      dayOfWeek: "TUESDAY",
      fullMonthAmount: 400, // 5 Tuesdays * $80
      perSessionRate: 80,
      enrollmentStart: new Date("2026-09-10"),
      enrollmentEnd: null,
    });
    // Only the 15th/22nd/29th fall on/after the 10th — 3 sessions, not 5.
    expect(amount).toBe(240);
  });

  it("returns the full-month amount unchanged when the enrollment covers the whole month", () => {
    const amount = computeProratedLineItemAmount({
      month: september,
      dayOfWeek: "TUESDAY",
      fullMonthAmount: 400,
      perSessionRate: 80,
      enrollmentStart: new Date("2026-08-01"),
      enrollmentEnd: null,
    });
    expect(amount).toBe(400);
  });

  it("prorates by calendar days when no per-session rate is available (fully flat-overridden fee)", () => {
    const amount = computeProratedLineItemAmount({
      month: september,
      dayOfWeek: null,
      fullMonthAmount: 100,
      perSessionRate: null,
      enrollmentStart: new Date("2026-09-16"),
      enrollmentEnd: null,
    });
    // 15 of September's 30 days (16th-30th inclusive) — half the flat fee.
    expect(amount).toBe(50);
  });

  it("also prorates for an enrollment that ends mid-month", () => {
    const amount = computeProratedLineItemAmount({
      month: september,
      dayOfWeek: "TUESDAY",
      fullMonthAmount: 400,
      perSessionRate: 80,
      enrollmentStart: new Date("2026-08-01"),
      enrollmentEnd: new Date("2026-09-16"),
    });
    // The 1st, 8th, and 15th fall on/before the 16th — 3 sessions, not 5.
    expect(amount).toBe(240);
  });
});

describe("computeDueDate", () => {
  it("lands on the configured day of the billing month, in UTC", () => {
    expect(computeDueDate(normalizeMonth("2026-09-01"), 5).toISOString()).toBe("2026-09-05T00:00:00.000Z");
  });
});

describe("isPaymentReminderDue", () => {
  const september = normalizeMonth("2026-09-01");

  it("is not due before the due date has passed", () => {
    expect(isPaymentReminderDue(september, 5, 7, new Date("2026-09-10T00:00:00.000Z"))).toBe(false);
  });

  it("is not due on the day the reminder window ends but hasn't yet elapsed", () => {
    expect(isPaymentReminderDue(september, 5, 7, new Date("2026-09-11T23:59:59.999Z"))).toBe(false);
  });

  it("becomes due exactly N days after the due date", () => {
    expect(isPaymentReminderDue(september, 5, 7, new Date("2026-09-12T00:00:00.000Z"))).toBe(true);
  });

  it("stays due any time after the threshold", () => {
    expect(isPaymentReminderDue(september, 5, 7, new Date("2026-10-01T00:00:00.000Z"))).toBe(true);
  });
});
