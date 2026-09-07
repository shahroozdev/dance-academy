"use server";

import { requireAdmin } from "@/actions/access";
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
  await requireAdmin();
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

export type RegistrationFunnelStage = { stage: string; count: number };

// Submitted -> Reviewed (approved or rejected) -> Approved & Enrolled — each stage a subset of the
// one before it, so the chart reads as a true funnel rather than a plain status breakdown.
export async function getRegistrationFunnel(): Promise<RegistrationFunnelStage[]> {
  await requireAdmin();
  const [submitted, processed, rejected] = await Promise.all([
    db.registrationRequest.count(),
    db.registrationRequest.count({ where: { status: "PROCESSED" } }),
    db.registrationRequest.count({ where: { status: "REJECTED" } }),
  ]);

  return [
    { stage: "Submitted", count: submitted },
    { stage: "Reviewed", count: processed + rejected },
    { stage: "Approved & Enrolled", count: processed },
  ];
}

export type BillingStatusCount = { status: "UNPAID" | "PARTIAL" | "PAID" | "OVERPAID"; count: number };

// Mirrors the billing list page's status set — DRAFT bills aren't shown there either, since
// they're an internal pre-finalization state, not something admins act on.
export async function getBillingStatusBreakdown(): Promise<BillingStatusCount[]> {
  await requireAdmin();
  const monthValue = currentMonthValue();
  const month = normalizeMonth(monthValue);
  const statuses = ["UNPAID", "PARTIAL", "PAID", "OVERPAID"] as const;

  const rows = await db.monthlyStudentBilling.groupBy({
    by: ["status"],
    where: { month, status: { in: [...statuses] } },
    _count: { _all: true },
  });
  const countByStatus = new Map(rows.map((r) => [r.status, r._count?._all ?? 0]));

  return statuses.map((status) => ({ status, count: countByStatus.get(status) ?? 0 }));
}
