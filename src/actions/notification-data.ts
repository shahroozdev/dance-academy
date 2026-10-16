import "server-only";
import { getUnfinalizedClasses } from "@/actions/billing-service";
import { idSchema } from "@/actions/validation.schema";
import { normalizeMonth, round2 } from "@/lib/billing";
import { db } from "@/lib/db";
import { buildFamilyMessage, buildFeeBreakdown, buildWhatsAppLink } from "@/lib/notifications";
import type { FeeNoticeStudentBill } from "@/types/billing";
import type { FamilyNotificationPreview, PendingFamilyNotification } from "@/types/notifications";

function monthLabelOf(month: Date): string {
  return month.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

type NoticeBill = {
  student: { fullName: string };
  finalAmountDue: unknown;
  amountPaid: unknown;
  balance: unknown;
  multiClassDiscount: unknown;
  siblingDiscount: unknown;
  adjustment: unknown;
  lineItems: Array<{
    amount: unknown;
    classMonthlyFee: { rate: unknown; class: { name: string; discountEligible: boolean; pricingType: string } };
  }>;
};

function toFeeNoticeBill(bill: NoticeBill): FeeNoticeStudentBill {
  return {
    name: bill.student.fullName,
    finalAmountDue: Number(bill.finalAmountDue),
    amountPaid: Number(bill.amountPaid),
    balance: Number(bill.balance),
    multiClassDiscount: Number(bill.multiClassDiscount),
    siblingDiscount: Number(bill.siblingDiscount),
    adjustment: Number(bill.adjustment),
    lines: bill.lineItems.map((line) => {
      const cls = line.classMonthlyFee.class;
      const seasonal = cls.pricingType === "SEASONAL";
      return {
        className: cls.name.trim(),
        amount: Number(line.amount),
        rate: line.classMonthlyFee.rate === null ? null : Number(line.classMonthlyFee.rate),
        discountEligible: cls.discountEligible && !seasonal,
        seasonal,
      };
    }),
  };
}

export async function getFamilyNotificationPreview(
  familyId: string,
  monthInput: string,
): Promise<FamilyNotificationPreview> {
  familyId = idSchema.parse(familyId);
  const month = normalizeMonth(monthInput);
  const family = await db.family.findUniqueOrThrow({ where: { id: familyId } });
  // This month's bills, plus any earlier month that still has money owed or a credit, so the
  // parent sees everything outstanding in one message.
  const noticeBills = await db.monthlyStudentBilling.findMany({
    where: { student: { familyId }, OR: [{ month }, { month: { lt: month }, balance: { not: 0 } }] },
    include: {
      student: true,
      lineItems: { include: { classMonthlyFee: { select: { rate: true, class: { select: { name: true, discountEligible: true, pricingType: true } } } } } },
    },
    orderBy: [{ month: "asc" }, { student: { fullName: "asc" } }],
  });
  const billings = noticeBills.filter((b) => b.month.getTime() === month.getTime());
  if (billings.length === 0) {
    throw new Error("No bills found for this family in this month.");
  }

  const students = billings.map((b) => ({
    billingId: b.id,
    name: b.student.fullName,
    finalAmountDue: Number(b.finalAmountDue),
  }));
  const total = round2(students.reduce((sum, s) => sum + s.finalAmountDue, 0));
  const months = [...new Set(noticeBills.map((b) => b.month.getTime()))].map((time) => ({
    monthLabel: monthLabelOf(new Date(time)),
    students: noticeBills.filter((b) => b.month.getTime() === time).map(toFeeNoticeBill),
  }));
  const breakdown = buildFeeBreakdown(months);
  const message = buildFamilyMessage({ parentGuardianName: family.parentGuardianName, months });
  const unfinalizedClassNames = await getUnfinalizedClasses(billings.map((b) => b.id));

  return {
    familyId,
    familyName: family.familyName,
    parentGuardianName: family.parentGuardianName,
    phone: family.phone,
    email: family.email,
    month: month.toISOString(),
    students,
    total,
    breakdown,
    message,
    waLink: buildWhatsAppLink(family.phone, message),
    alreadySent: billings.every((b) => b.notificationStatus === "SENT"),
    finalized: unfinalizedClassNames.length === 0,
    unfinalizedClassNames,
  };
}

export async function getPendingNotifications(monthInput: string): Promise<PendingFamilyNotification[]> {
  const month = normalizeMonth(monthInput);
  const billings = await db.monthlyStudentBilling.findMany({
    where: { month, notificationStatus: { not: "SENT" } },
    include: { student: { include: { family: true } } },
  });

  const byFamily = new Map<string, { familyName: string; total: number; count: number }>();
  for (const b of billings) {
    const key = b.student.familyId;
    const entry = byFamily.get(key) ?? { familyName: b.student.family.familyName, total: 0, count: 0 };
    entry.total = round2(entry.total + Number(b.finalAmountDue));
    entry.count += 1;
    byFamily.set(key, entry);
  }

  return [...byFamily.entries()]
    .map(([familyId, v]) => ({ familyId, familyName: v.familyName, studentCount: v.count, total: v.total }))
    .sort((a, b) => a.familyName.localeCompare(b.familyName));
}

