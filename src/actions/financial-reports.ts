"use server";

import { round2 } from "@/lib/billing";
import { db } from "@/lib/db";
import { periodDateFilter, type Period } from "@/lib/period";

export type FinancialSummary = {
  tuitionCollected: number;
  otherIncome: number;
  otherIncomeByCategory: { category: string; amount: number }[];
  totalIncome: number;
  rent: number;
  costumesProps: number;
  otherExpenses: number;
  otherExpensesByCategory: { category: string; amount: number }[];
  totalExpenses: number;
  netProfit: number;
};

// Billed vs. collected (docs/06-financial-reporting.md §6.1): tuition income here is always
// SUM(Payment.amount) grouped by paymentDate — never MonthlyStudentBilling.finalAmountDue, so a
// payment received in October against September's bill counts as October income, as required.
export async function getFinancialSummary(period: Period): Promise<FinancialSummary> {
  const dateFilter = periodDateFilter(period);

  const [paymentsAgg, otherIncomeRows, expenseRows] = await Promise.all([
    db.payment.aggregate({ where: { paymentDate: dateFilter }, _sum: { amount: true } }),
    db.otherIncome.groupBy({ by: ["category"], where: { date: dateFilter }, _sum: { amount: true } }),
    db.expense.groupBy({ by: ["category"], where: { date: dateFilter }, _sum: { amount: true } }),
  ]);

  const tuitionCollected = round2(Number(paymentsAgg._sum.amount ?? 0));

  const otherIncomeByCategory = otherIncomeRows.map((r) => ({
    category: r.category,
    amount: round2(Number(r._sum.amount ?? 0)),
  }));
  const otherIncome = round2(otherIncomeByCategory.reduce((sum, r) => sum + r.amount, 0));
  const totalIncome = round2(tuitionCollected + otherIncome);

  const expenseByCategory = new Map(expenseRows.map((r) => [r.category, round2(Number(r._sum.amount ?? 0))]));
  const rent = expenseByCategory.get("STUDIO_RENT") ?? 0;
  const costumesProps = round2((expenseByCategory.get("COSTUMES") ?? 0) + (expenseByCategory.get("JEWELRY_PROPS") ?? 0));
  const otherExpensesByCategory = [...expenseByCategory.entries()]
    .filter(([category]) => !["STUDIO_RENT", "COSTUMES", "JEWELRY_PROPS"].includes(category))
    .map(([category, amount]) => ({ category, amount }));
  const otherExpenses = round2(otherExpensesByCategory.reduce((sum, r) => sum + r.amount, 0));
  const totalExpenses = round2(rent + costumesProps + otherExpenses);
  const netProfit = round2(totalIncome - totalExpenses);

  return {
    tuitionCollected,
    otherIncome,
    otherIncomeByCategory,
    totalIncome,
    rent,
    costumesProps,
    otherExpenses,
    otherExpensesByCategory,
    totalExpenses,
    netProfit,
  };
}

export type MonthlyTrendPoint = { month: string; income: number; expenses: number };

// Powers the Yearly view's income-vs-expenses bar chart.
export async function getMonthlyTrend(year: number): Promise<MonthlyTrendPoint[]> {
  const points: MonthlyTrendPoint[] = [];
  for (let month = 0; month < 12; month++) {
    const start = new Date(Date.UTC(year, month, 1));
    const end = new Date(Date.UTC(year, month + 1, 1));
    const [paymentsAgg, otherIncomeAgg, expenseAgg] = await db.$transaction([
      db.payment.aggregate({ where: { paymentDate: { gte: start, lt: end } }, _sum: { amount: true } }),
      db.otherIncome.aggregate({ where: { date: { gte: start, lt: end } }, _sum: { amount: true } }),
      db.expense.aggregate({ where: { date: { gte: start, lt: end } }, _sum: { amount: true } }),
    ]);
    points.push({
      month: `${year}-${String(month + 1).padStart(2, "0")}`,
      income: round2(Number(paymentsAgg._sum.amount ?? 0) + Number(otherIncomeAgg._sum.amount ?? 0)),
      expenses: round2(Number(expenseAgg._sum.amount ?? 0)),
    });
  }
  return points;
}

// Distinct years spanned by any financial activity, unioned with the current year, so a brand-new
// year with zero transactions is still selectable (§6.5) without any per-year setup.
export async function getAvailableYears(): Promise<number[]> {
  const [paymentAgg, expenseAgg, incomeAgg] = await Promise.all([
    db.payment.aggregate({ _min: { paymentDate: true }, _max: { paymentDate: true } }),
    db.expense.aggregate({ _min: { date: true }, _max: { date: true } }),
    db.otherIncome.aggregate({ _min: { date: true }, _max: { date: true } }),
  ]);

  const dates = [
    paymentAgg._min.paymentDate,
    paymentAgg._max.paymentDate,
    expenseAgg._min.date,
    expenseAgg._max.date,
    incomeAgg._min.date,
    incomeAgg._max.date,
  ].filter((d): d is Date => d !== null);

  const currentYear = new Date().getUTCFullYear();
  const years = dates.map((d) => d.getUTCFullYear()).concat(currentYear);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);

  const result: number[] = [];
  for (let y = maxYear; y >= minYear; y--) result.push(y);
  return result;
}
