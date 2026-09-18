"use server";

import { requireAdmin } from "@/actions/access";
import { classBillingPauseSchema, type ClassBillingPauseInput } from "@/actions/class-pauses.schema";
import { idSchema } from "@/actions/validation.schema";
import { db } from "@/lib/db";

export async function createClassBillingPause(classId: string, input: ClassBillingPauseInput) {
  await requireAdmin();
  classId = idSchema.parse(classId);
  input = classBillingPauseSchema.parse(input);
  const startMonth = new Date(`${input.startMonth}-01T00:00:00.000Z`);
  const endMonth = new Date(`${input.endMonth}-01T00:00:00.000Z`);
  const overlap = await db.classBillingPause.findFirst({
    where: { classId, startMonth: { lte: endMonth }, endMonth: { gte: startMonth } },
  });
  if (overlap) throw new Error("This class already has a break covering part of that period.");
  return db.classBillingPause.create({
    data: { classId, startMonth, endMonth, reason: input.reason || null },
  });
}

export async function deleteClassBillingPause(id: string) {
  await requireAdmin();
  id = idSchema.parse(id);
  return db.classBillingPause.delete({ where: { id } });
}
