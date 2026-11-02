"use server";

import { requireAdmin } from "@/actions/access";
import { idSchema, validateListQuery } from "@/actions/validation.schema";
import type { Prisma } from "@/generated/prisma/client";
import { round2 } from "@/lib/billing";
import { db } from "@/lib/db";
import { summarizeClassOutstanding, toOutstandingBill, type OutstandingBillInput } from "@/lib/outstanding-fees";
import { parsePageParams } from "@/lib/pagination";
import type { OutstandingFees } from "@/types/billing";

const OUTSTANDING = { balance: { gt: 0 } } satisfies Prisma.MonthlyStudentBillingWhereInput;

const BILL_DETAIL = {
  student: { select: { fullName: true, family: { select: { familyName: true } } } },
  lineItems: { include: { classMonthlyFee: { select: { class: { select: { id: true, name: true, discountEligible: true, pricingType: true } } } } } },
  payments: { select: { classId: true, amount: true } },
} satisfies Prisma.MonthlyStudentBillingInclude;

const ORDER = [
  { month: "asc" },
  { student: { family: { familyName: "asc" } } },
  { student: { fullName: "asc" } },
  { id: "asc" },
] satisfies Prisma.MonthlyStudentBillingOrderByWithRelationInput[];

type BillWithDetail = Prisma.MonthlyStudentBillingGetPayload<{ include: typeof BILL_DETAIL }>;

function toInput(bill: BillWithDetail): OutstandingBillInput {
  return {
    billingId: bill.id,
    studentId: bill.studentId,
    studentName: bill.student.fullName,
    familyName: bill.student.family.familyName,
    month: bill.month,
    finalAmountDue: Number(bill.finalAmountDue),
    amountPaid: Number(bill.amountPaid),
    balance: Number(bill.balance),
    multiClassDiscount: Number(bill.multiClassDiscount),
    siblingDiscount: Number(bill.siblingDiscount),
    adjustment: Number(bill.adjustment),
    lines: bill.lineItems.map((line) => {
      const cls = line.classMonthlyFee.class;
      return {
        classId: cls.id,
        className: cls.name.trim(),
        amount: Number(line.amount),
        discountEligible: cls.discountEligible && cls.pricingType !== "SEASONAL",
      };
    }),
    payments: bill.payments.map((payment) => ({ classId: payment.classId, amount: Number(payment.amount) })),
  };
}

// Every student who still owes money, across all months, optionally for one class.
//
// All classes: the database returns only the requested page; the bill count, student count and
// amount owed are database counts/sums over every outstanding bill, and the class split is worked
// out only for the rows on the page.
//
// One class: interim — see summarizeClassOutstanding. The database narrows to unpaid bills that
// contain the class, and the allocation rule (which needs each bill's payments) decides which of
// them still owe for it and how much, before the page is cut.
export async function getOutstandingFees(params?: { classId?: string; page?: number; pageSize?: number }): Promise<OutstandingFees> {
  await requireAdmin();
  validateListQuery(params, []);
  const { page, pageSize } = parsePageParams({ page: String(params?.page ?? ""), pageSize: String(params?.pageSize ?? "") });
  const classId = params?.classId ? idSchema.parse(params.classId) : undefined;

  const classOptions = (await db.class.findMany({
    where: { monthlyFees: { some: { lineItems: { some: { billing: OUTSTANDING } } } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })).map((cls) => ({ id: cls.id, name: cls.name.trim() }));

  if (classId) {
    const candidates = await db.monthlyStudentBilling.findMany({
      where: { ...OUTSTANDING, lineItems: { some: { classMonthlyFee: { classId } } } },
      include: BILL_DETAIL,
      orderBy: ORDER,
    });
    return { classId, classOptions, ...summarizeClassOutstanding(candidates.map(toInput), classId, { page, pageSize }) };
  }

  const [rows, total, studentCount, sums] = await Promise.all([
    db.monthlyStudentBilling.findMany({ where: OUTSTANDING, include: BILL_DETAIL, orderBy: ORDER, skip: (page - 1) * pageSize, take: pageSize }),
    db.monthlyStudentBilling.count({ where: OUTSTANDING }),
    db.student.count({ where: { monthlyBillings: { some: OUTSTANDING } } }),
    db.monthlyStudentBilling.aggregate({ where: OUTSTANDING, _sum: { balance: true } }),
  ]);
  return {
    classId: null,
    classOptions,
    data: rows.map((row) => toOutstandingBill(toInput(row))),
    total,
    pages: Math.ceil(total / pageSize),
    studentCount,
    amountDue: round2(Number(sums._sum.balance ?? 0)),
  };
}
