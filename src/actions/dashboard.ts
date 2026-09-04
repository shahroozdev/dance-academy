"use server";

import { normalizeMonth, round2 } from "@/lib/billing";
import { db } from "@/lib/db";
import { periodDateFilter } from "@/lib/period";

export type DashboardSummary = {
  month: string;
  currentMonthTuitionDue: number;
  currentMonthCollected: number;
  currentMonthOutstanding: number;
  activeStudentCount: number;
  unpaidCount: number;
  partialCount: number;
};

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const monthValue = currentMonthValue();
  const month = normalizeMonth(monthValue);
  const paymentDateFilter = periodDateFilter({ type: "MONTH", month: monthValue });

  const [billingAgg, paymentsAgg, activeStudentCount, unpaidCount, partialCount] = await Promise.all([
    db.monthlyStudentBilling.aggregate({
      where: { month },
      _sum: { finalAmountDue: true, balance: true },
    }),
    db.payment.aggregate({ where: { paymentDate: paymentDateFilter }, _sum: { amount: true } }),
    db.student.count({ where: { isActive: true } }),
    db.monthlyStudentBilling.count({ where: { month, status: "UNPAID" } }),
    db.monthlyStudentBilling.count({ where: { month, status: "PARTIAL" } }),
  ]);

  return {
    month: monthValue,
    currentMonthTuitionDue: round2(Number(billingAgg._sum.finalAmountDue ?? 0)),
    currentMonthCollected: round2(Number(paymentsAgg._sum.amount ?? 0)),
    currentMonthOutstanding: round2(Number(billingAgg._sum.balance ?? 0)),
    activeStudentCount,
    unpaidCount,
    partialCount,
  };
}
