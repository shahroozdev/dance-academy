"use server";

import { requireAdmin } from "@/actions/access";
import { recalculateBilling } from "@/actions/billing";
import { familyGuardianSchema, type FamilyGuardianInput } from "@/actions/family-guardians.schema";
import { serializableTransaction } from "@/actions/transaction";
import { idSchema } from "@/actions/validation.schema";
import { db } from "@/lib/db";

export async function createFamilyGuardian(familyId: string, input: FamilyGuardianInput) {
  await requireAdmin();
  familyId = idSchema.parse(familyId);
  input = familyGuardianSchema.parse(input);
  return db.familyGuardian.create({
    data: {
      familyId,
      name: input.name,
      relationship: input.relationship || null,
      email: input.email || null,
      phone: input.phone || null,
    },
  });
}

export async function updateFamilyGuardian(id: string, input: FamilyGuardianInput) {
  await requireAdmin();
  id = idSchema.parse(id);
  input = familyGuardianSchema.parse(input);
  return serializableTransaction(async (tx) => {
    const guardian = await tx.familyGuardian.update({
      where: { id },
      data: {
        name: input.name,
        relationship: input.relationship || null,
        email: input.email || null,
        phone: input.phone || null,
      },
    });
    if (guardian.isPrimary) {
      if (!guardian.phone) throw new Error("A primary billing guardian must have a phone number.");
      await tx.family.update({
        where: { id: guardian.familyId },
        data: { parentGuardianName: guardian.name, email: guardian.email, phone: guardian.phone },
      });
    }
    return guardian;
  });
}

export async function deleteFamilyGuardian(id: string) {
  await requireAdmin();
  id = idSchema.parse(id);
  const guardian = await db.familyGuardian.findUniqueOrThrow({ where: { id } });
  if (guardian.isPrimary) throw new Error("Choose another primary guardian before removing this contact.");
  return db.familyGuardian.delete({ where: { id } });
}

export async function setPrimaryFamilyGuardian(id: string) {
  await requireAdmin();
  id = idSchema.parse(id);
  return serializableTransaction(async (tx) => {
    const guardian = await tx.familyGuardian.findUniqueOrThrow({ where: { id } });
    if (!guardian.phone) throw new Error("A primary billing guardian must have a phone number.");
    await tx.familyGuardian.updateMany({
      where: { familyId: guardian.familyId },
      data: { isPrimary: false, receivesNotifications: false },
    });
    await tx.familyGuardian.update({
      where: { id },
      data: { isPrimary: true, receivesNotifications: true },
    });
    await tx.family.update({
      where: { id: guardian.familyId },
      data: {
        parentGuardianName: guardian.name,
        email: guardian.email,
        phone: guardian.phone,
      },
    });
    return { familyId: guardian.familyId };
  });
}

export async function combineFamilies(sourceFamilyId: string, targetFamilyId: string) {
  await requireAdmin();
  sourceFamilyId = idSchema.parse(sourceFamilyId);
  targetFamilyId = idSchema.parse(targetFamilyId);
  if (sourceFamilyId === targetFamilyId) throw new Error("Select a different destination family.");

  const affectedBillingIds = await serializableTransaction(async (tx) => {
    const [source, target] = await Promise.all([
      tx.family.findUniqueOrThrow({ where: { id: sourceFamilyId }, include: { guardians: true } }),
      tx.family.findUniqueOrThrow({ where: { id: targetFamilyId }, include: { guardians: true } }),
    ]);
    const targetKeys = new Set(target.guardians.map((guardian) =>
      `${guardian.name.toLowerCase()}|${guardian.email?.toLowerCase() ?? ""}|${guardian.phone ?? ""}`));
    const contactsToCopy = source.guardians.filter((guardian) =>
      !targetKeys.has(`${guardian.name.toLowerCase()}|${guardian.email?.toLowerCase() ?? ""}|${guardian.phone ?? ""}`));
    if (contactsToCopy.length > 0) {
      await tx.familyGuardian.createMany({
        data: contactsToCopy.map((guardian) => ({
          familyId: target.id,
          name: guardian.name,
          relationship: guardian.relationship,
          email: guardian.email,
          phone: guardian.phone,
          isPrimary: false,
          receivesNotifications: false,
        })),
      });
    }
    await tx.student.updateMany({ where: { familyId: source.id }, data: { familyId: target.id } });
    await tx.registrationRequest.updateMany({ where: { matchedFamilyId: source.id }, data: { matchedFamilyId: target.id } });
    await tx.notificationLog.updateMany({ where: { familyId: source.id }, data: { familyId: target.id } });
    await tx.family.delete({ where: { id: source.id } });

    const bills = await tx.monthlyStudentBilling.findMany({
      where: { student: { familyId: target.id }, payments: { none: {} } },
      select: { id: true },
    });
    return bills.map((bill) => bill.id);
  });
  for (const billingId of affectedBillingIds) await recalculateBilling(billingId);
  return { targetFamilyId, recalculatedBills: affectedBillingIds.length };
}
