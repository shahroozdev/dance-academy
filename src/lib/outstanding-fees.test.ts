import { describe, expect, it } from "vitest";

import { computeBillingStatus, computeStudentBilling, discountedLineAmounts, round2, splitCentsProportionally } from "@/lib/billing";
import { allocateBillBalance, summarizeClassOutstanding, toOutstandingBill, type OutstandingBillInput } from "@/lib/outstanding-fees";

const onam = { classId: "onam", className: "Onam Dance 2026 SJ", amount: 160, discountEligible: false };
const western = { classId: "western", className: "2026 Western", amount: 60, discountEligible: true };
const cinematic = { classId: "cinematic", className: "2026 Cinematic", amount: 60, discountEligible: true };
const bharatanatyam = { classId: "bn", className: "Bharatanatyam", amount: 80, discountEligible: true };

type Line = OutstandingBillInput["lines"][number];
type Payment = OutstandingBillInput["payments"][number];

// Builds a bill the way the billing service does, so totals, discounts and status are consistent.
function bill(lines: Line[], payments: Payment[] = [], options: { sibling?: boolean; adjustment?: number; id?: string; studentId?: string; month?: string } = {}): OutstandingBillInput {
  const computed = computeStudentBilling({
    lineItems: lines.map((line) => ({ enrollmentId: line.classId, classMonthlyFeeId: line.classId, amount: line.amount, discountEligible: line.discountEligible })),
    hasSiblingDiscount: options.sibling ?? false,
    adjustment: options.adjustment ?? 0,
  });
  const amountPaid = round2(payments.reduce((sum, payment) => sum + payment.amount, 0));
  return {
    billingId: options.id ?? "bill",
    studentId: options.studentId ?? "student",
    studentName: "Student",
    familyName: "Family",
    month: new Date(`${options.month ?? "2026-10"}-01T00:00:00.000Z`),
    finalAmountDue: computed.finalAmountDue,
    amountPaid,
    balance: round2(computed.finalAmountDue - amountPaid),
    multiClassDiscount: computed.multiClassDiscount,
    siblingDiscount: computed.siblingDiscount,
    adjustment: computed.adjustment,
    lines,
    payments,
  };
}

// A mix of negative, positive and no adjustments across the generated bills.
function adjustmentFor(seed: number): number {
  if (seed % 4 === 0) return -round2(seed % 13);
  return seed % 7 === 0 ? 9.99 : 0;
}

const pendingOf = (input: OutstandingBillInput) => Object.fromEntries(allocateBillBalance(input).map((fee) => [fee.classId ?? "adjustment", fee.pending]));
const pendingSum = (input: OutstandingBillInput) => round2(allocateBillBalance(input).reduce((sum, fee) => sum + fee.pending, 0));

describe("splitCentsProportionally", () => {
  it("always adds up to the total, giving leftover cents to the largest remainders", () => {
    expect(splitCentsProportionally(100, [1, 1, 1])).toEqual([34, 33, 33]);
    expect(splitCentsProportionally(0, [5, 5])).toEqual([0, 0]);
    expect(splitCentsProportionally(10, [0, 0])).toEqual([0, 0]);
  });
});

describe("discountedLineAmounts", () => {
  it("spreads both discounts over discount-eligible classes only and leaves seasonal fees whole", () => {
    expect(discountedLineAmounts({ multiClassDiscount: 6, siblingDiscount: 5.7 }, [cinematic, western, onam])).toEqual([54.15, 54.15, 160]);
  });

  it("reconciles rounding so the class shares add up to the discounted subtotal exactly", () => {
    const lines = [{ amount: 20, discountEligible: true }, { amount: 20, discountEligible: true }, { amount: 20, discountEligible: true }];
    const shares = discountedLineAmounts({ multiClassDiscount: 3, siblingDiscount: 2.85 }, lines);
    expect(round2(shares.reduce((sum, share) => sum + share, 0))).toBe(54.15);
    expect(shares).toEqual([18.05, 18.05, 18.05]);
    const uneven = discountedLineAmounts({ multiClassDiscount: 0.01, siblingDiscount: 0 }, lines);
    expect(round2(uneven.reduce((sum, share) => sum + share, 0))).toBe(59.99);
  });
});

describe("allocateBillBalance — the class split never overlaps or exceeds the balance", () => {
  it("unpaid multi-class bill: each class owes its share after discounts", () => {
    expect(pendingOf(bill([cinematic, western], [], { sibling: true }))).toEqual({ cinematic: 54.15, western: 54.15 });
  });

  it("general partial payment: shared in proportion, so every class stays pending and the parts equal the balance", () => {
    const input = bill([bharatanatyam, western], [{ classId: null, amount: 50 }]);
    expect(pendingOf(input)).toEqual({ bn: 47.43, western: 35.57 });
    expect(pendingSum(input)).toBe(input.balance);
  });

  it("class-specific payment: covers that class first, leaving the rest on the other classes", () => {
    const input = bill([cinematic, western], [{ classId: "cinematic", amount: 57 }]);
    expect(pendingOf(input)).toEqual({ western: 57 });
  });

  it("class-specific payment larger than its class: the extra is shared across the other classes", () => {
    const input = bill([cinematic, western], [{ classId: "cinematic", amount: 77 }]);
    expect(pendingOf(input)).toEqual({ western: 37 });
    expect(pendingSum(input)).toBe(input.balance);
  });

  it("payment assigned to a class that is not on the bill counts as a general payment", () => {
    const input = bill([cinematic, western], [{ classId: "removed-class", amount: 14 }]);
    expect(pendingSum(input)).toBe(input.balance);
    expect(pendingOf(input)).toEqual({ cinematic: 50, western: 50 });
  });

  it("refund after a class payment: the refunded amount becomes owed again", () => {
    const input = bill([cinematic, western], [{ classId: "cinematic", amount: 57 }, { classId: null, amount: -20 }]);
    expect(input.balance).toBe(77);
    expect(pendingSum(input)).toBe(77);
    expect(pendingOf(input)).toEqual({ cinematic: 20, western: 57 });
  });

  it("paid in full or in credit: nothing is pending", () => {
    expect(allocateBillBalance(bill([cinematic], [{ classId: null, amount: 60 }]))).toEqual([]);
    const credit = bill([cinematic], [{ classId: null, amount: 80 }]);
    expect(computeBillingStatus(credit.finalAmountDue, credit.amountPaid)).toBe("OVERPAID");
    expect(allocateBillBalance(credit)).toEqual([]);
  });

  it("positive adjustment is owed as its own line; negative adjustment reduces the classes", () => {
    const extra = bill([western], [], { adjustment: 15 });
    expect(pendingOf(extra)).toEqual({ western: 60, adjustment: 15 });
    const reduced = bill([cinematic, western], [], { adjustment: -20 });
    expect(pendingOf(reduced)).toEqual({ cinematic: 47, western: 47 });
    expect(pendingSum(reduced)).toBe(reduced.balance);
  });

  it("seasonal fee with a regular class: the seasonal fee keeps its full share", () => {
    expect(pendingOf(bill([onam, western], [], { sibling: true }))).toEqual({ onam: 160, western: 57 });
  });

  it("sums to the balance exactly across many uneven bills", () => {
    const linesPool = [cinematic, western, bharatanatyam, onam, { classId: "x", className: "X", amount: 33.33, discountEligible: true }];
    for (let seed = 1; seed <= 200; seed++) {
      const lines = linesPool.filter((_, index) => (seed >> index) % 2 === 1 || index === seed % linesPool.length);
      const payments: Payment[] = [
        { classId: seed % 3 === 0 ? lines[0].classId : null, amount: round2((seed * 7.37) % 90) },
        ...(seed % 5 === 0 ? [{ classId: null, amount: -round2((seed * 1.11) % 10) }] : []),
      ];
      const input = bill(lines, payments, { sibling: seed % 2 === 0, adjustment: adjustmentFor(seed) });
      const fees = allocateBillBalance(input);
      expect(round2(fees.reduce((sum, fee) => sum + fee.pending, 0))).toBe(Math.max(0, input.balance));
      expect(new Set(fees.map((fee) => fee.classId)).size).toBe(fees.length);
      expect(fees.every((fee) => fee.pending > 0)).toBe(true);
    }
  });
});

describe("summarizeClassOutstanding (one-class view)", () => {
  const candidates = [
    bill([onam], [], { id: "aug", studentId: "s1", month: "2026-08" }),
    bill([cinematic, western], [{ classId: null, amount: 50 }], { id: "oct", studentId: "s1", sibling: true }),
    bill([onam], [{ classId: "onam", amount: 160 }], { id: "paid", studentId: "s2", month: "2026-08" }),
    bill([onam, western], [{ classId: "onam", amount: 160 }], { id: "onam-covered", studentId: "s3", month: "2026-09" }),
    bill([onam, western], [], { id: "onam-owed", studentId: "s4", month: "2026-09" }),
  ];

  it("keeps only bills that still owe for the class and totals that class's amounts", () => {
    const result = summarizeClassOutstanding(candidates, "onam", { page: 1, pageSize: 20 });
    expect(result.data.map((row) => row.billingId)).toEqual(["aug", "onam-owed"]);
    expect(result).toMatchObject({ total: 2, pages: 1, studentCount: 2, amountDue: 320 });
  });

  it("class totals across classes add up to the sum of the balances, without overlap", () => {
    const balances = round2(candidates.filter((b) => b.balance > 0).reduce((sum, b) => sum + b.balance, 0));
    const perClass = ["onam", "cinematic", "western"].map((id) => summarizeClassOutstanding(candidates, id, { page: 1, pageSize: 20 }).amountDue);
    expect(round2(perClass.reduce((sum, amount) => sum + amount, 0))).toBe(balances);
  });

  it("cuts the requested page while the counts and amount cover every matching bill", () => {
    const many = Array.from({ length: 45 }, (_, index) => bill([western], [], { id: `b${index}`, studentId: `s${index}` }));
    const second = summarizeClassOutstanding(many, "western", { page: 2, pageSize: 20 });
    expect(second.data.map((row) => row.billingId)).toEqual(many.slice(20, 40).map((row) => row.billingId));
    expect(second).toMatchObject({ total: 45, pages: 3, studentCount: 45, amountDue: 2700 });
    expect(summarizeClassOutstanding(many, "western", { page: 3, pageSize: 20 }).data).toHaveLength(5);
  });
});

describe("toOutstandingBill", () => {
  it("carries the bill's figures with its class split", () => {
    expect(toOutstandingBill(bill([cinematic, western], [{ classId: "cinematic", amount: 57 }]))).toMatchObject({
      balance: 57,
      amountPaid: 57,
      month: "2026-10-01T00:00:00.000Z",
      pendingClasses: [{ classId: "western", className: "2026 Western", pending: 57 }],
    });
  });
});
