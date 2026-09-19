"use server";

import { requireAdmin } from "@/actions/access";
import { recalculateClassRangeBills } from "@/actions/billing-impact";
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
  const pause = await db.classBillingPause.create({
    data: { classId, startMonth, endMonth, reason: input.reason || null },
  });
  await db.classMonthlyFee.updateMany({
    where: { classId, month: { gte: startMonth, lte: endMonth } },
    data: { isFinalized: false, finalizedAt: null },
  });
  await recalculateClassRangeBills(
    classId,
    startMonth,
    endMonth,
    "A class break changed this billing period after payment was recorded. Review the bill and add an adjustment if needed.",
  );
  return pause;
}

export async function deleteClassBillingPause(id: string) {
  await requireAdmin();
  id = idSchema.parse(id);
  const pause = await db.classBillingPause.delete({ where: { id } });
  await db.classMonthlyFee.updateMany({
    where: { classId: pause.classId, month: { gte: pause.startMonth, lte: pause.endMonth } },
    data: { isFinalized: false, finalizedAt: null },
  });
  await recalculateClassRangeBills(
    pause.classId,
    pause.startMonth,
    pause.endMonth,
    "A class break was removed after payment was recorded. Review the bill and add an adjustment if needed.",
  );
  return pause;
}
