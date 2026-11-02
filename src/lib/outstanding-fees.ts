import { discountedLineAmounts, splitCentsProportionally } from "@/lib/billing";
import type { OutstandingBill, OutstandingClassFee, OutstandingFees } from "@/types/billing";

export type OutstandingBillInput = {
  billingId: string;
  studentId: string;
  studentName: string;
  familyName: string;
  month: Date;
  finalAmountDue: number;
  amountPaid: number;
  balance: number;
  multiClassDiscount: number;
  siblingDiscount: number;
  adjustment: number;
  lines: Array<{ classId: string; className: string; amount: number; discountEligible: boolean }>;
  payments: Array<{ classId: string | null; amount: number }>;
};

const toCents = (amount: number) => Math.round(amount * 100);

// How a bill's unpaid balance is split across its classes (the allocation rule):
// 1. Each class owes its share of the bill after discounts; a positive adjustment is its own line.
// 2. Payments recorded for a class go to that class first, up to its share.
// 3. Everything else that reduces the bill — general payments, any amount paid for a class beyond
//    its share or for a class not on the bill, a negative adjustment — is shared across what each
//    class still owes, in proportion. A refund (negative payment) reduces this shared amount first.
// So every class stays pending until the bill is paid unless its own payments cover it, and the
// class amounts never overlap: they add up to exactly the bill's balance, to the cent.
export function allocateBillBalance(bill: OutstandingBillInput): OutstandingClassFee[] {
  const shares = discountedLineAmounts(bill, bill.lines);
  const components = [
    ...bill.lines.map((line, index) => ({ classId: line.classId as string | null, className: line.className, owed: toCents(shares[index]) })),
    ...(bill.adjustment > 0 ? [{ classId: null, className: "Adjustment", owed: toCents(bill.adjustment) }] : []),
  ];
  const credit = toCents(bill.amountPaid) + Math.max(0, -toCents(bill.adjustment));
  const applied = components.map((component) => {
    if (!component.classId) return 0;
    const paidForClass = bill.payments
      .filter((payment) => payment.classId === component.classId)
      .reduce((sum, payment) => sum + toCents(payment.amount), 0);
    return Math.min(component.owed, Math.max(0, paidForClass));
  });
  // Refunds can leave less credit than the class payments applied above; give back the excess,
  // starting from the last class.
  let excess = applied.reduce((sum, cents) => sum + cents, 0) - credit;
  for (let index = applied.length - 1; index >= 0 && excess > 0; index--) {
    const reduce = Math.min(applied[index], excess);
    applied[index] -= reduce;
    excess -= reduce;
  }
  const remaining = components.map((component, index) => component.owed - applied[index]);
  const sharedCredit = credit - applied.reduce((sum, cents) => sum + cents, 0);
  const pendingTotal = Math.max(0, remaining.reduce((sum, cents) => sum + cents, 0) - sharedCredit);
  const pending = splitCentsProportionally(pendingTotal, remaining);
  return components
    .map((component, index) => ({ classId: component.classId, className: component.className, pending: pending[index] / 100 }))
    .filter((fee) => fee.pending > 0);
}

export function toOutstandingBill(bill: OutstandingBillInput): OutstandingBill {
  return {
    billingId: bill.billingId,
    studentId: bill.studentId,
    studentName: bill.studentName,
    familyName: bill.familyName,
    month: bill.month.toISOString(),
    finalAmountDue: bill.finalAmountDue,
    amountPaid: bill.amountPaid,
    balance: bill.balance,
    pendingClasses: allocateBillBalance(bill),
  };
}

// One class's outstanding fees. Interim, in memory: whether a class is still owed on a bill, and
// how much, comes from the allocation rule above, which needs each bill's payments, so the caller
// passes every unpaid bill that contains the class (already narrowed by the database) and the page
// is cut here. Persisting each line's outstanding amount (see docs/current-tasks.md) would let the
// database filter, count, total and paginate this view directly.
export function summarizeClassOutstanding(
  candidates: OutstandingBillInput[],
  classId: string,
  { page, pageSize }: { page: number; pageSize: number },
): Pick<OutstandingFees, "data" | "total" | "pages" | "studentCount" | "amountDue"> {
  const owed = candidates
    .filter((bill) => bill.balance > 0)
    .map(toOutstandingBill)
    .filter((bill) => bill.pendingClasses.some((fee) => fee.classId === classId));
  const amountCents = owed.reduce((sum, bill) => sum + toCents(bill.pendingClasses.find((fee) => fee.classId === classId)?.pending ?? 0), 0);
  return {
    data: owed.slice((page - 1) * pageSize, page * pageSize),
    total: owed.length,
    pages: Math.ceil(owed.length / pageSize),
    studentCount: new Set(owed.map((bill) => bill.studentId)).size,
    amountDue: amountCents / 100,
  };
}
