import { describe, expect, it } from "vitest";

import {
  computeBillingStatus,
  computeStudentBilling,
  countWeekdayOccurrencesInMonth,
  enrollmentOverlapsMonth,
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
