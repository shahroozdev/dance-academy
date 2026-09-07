import "server-only";
import { getUnfinalizedClasses } from "@/actions/billing-service";
import { idSchema } from "@/actions/validation.schema";
import { normalizeMonth, round2 } from "@/lib/billing";
import { db } from "@/lib/db";
import { buildFamilyMessage, buildWhatsAppLink } from "@/lib/notifications";
import type { FamilyNotificationPreview, PendingFamilyNotification } from "@/types/notifications";

export async function getFamilyNotificationPreview(
  familyId: string,
  monthInput: string,
): Promise<FamilyNotificationPreview> {
  familyId = idSchema.parse(familyId);
  const month = normalizeMonth(monthInput);
  const family = await db.family.findUniqueOrThrow({ where: { id: familyId } });
  const billings = await db.monthlyStudentBilling.findMany({
    where: { month, student: { familyId } },
    include: { student: true },
    orderBy: { student: { fullName: "asc" } },
  });
  if (billings.length === 0) {
    throw new Error("No bills found for this family in this month.");
  }

  const students = billings.map((b) => ({
    billingId: b.id,
    name: b.student.fullName,
    finalAmountDue: Number(b.finalAmountDue),
  }));
  const total = round2(students.reduce((sum, s) => sum + s.finalAmountDue, 0));
  const monthLabel = month.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  const message = buildFamilyMessage({ parentGuardianName: family.parentGuardianName, monthLabel, students });
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

