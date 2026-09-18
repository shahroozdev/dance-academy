"use server";

import { requireAdmin } from "@/actions/access";
import { classExtraSessionSchema, type ClassExtraSessionInput } from "@/actions/extra-sessions.schema";
import { idSchema } from "@/actions/validation.schema";
import { normalizeMonth, round2 } from "@/lib/billing";
import { db } from "@/lib/db";

function nextMonth(month: Date) {
  return new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1));
}

export async function getClassExtraSessions(classId: string, monthInput: string) {
  await requireAdmin();
  classId = idSchema.parse(classId);
  const month = normalizeMonth(monthInput);
  const sessions = await db.classExtraSession.findMany({
    where: { classId, sessionDate: { gte: month, lt: nextMonth(month) } },
    orderBy: { sessionDate: "asc" },
  });
  return sessions.map((session) => ({
    ...session,
    quantity: Number(session.quantity),
    rate: Number(session.rate),
    amount: Number(session.amount),
  }));
}

export async function createClassExtraSession(input: ClassExtraSessionInput) {
  await requireAdmin();
  input = classExtraSessionSchema.parse(input);
  const sessionDate = new Date(`${input.sessionDate}T00:00:00.000Z`);
  const amount = round2(input.quantity * input.rate);
  const session = await db.classExtraSession.create({
    data: { ...input, sessionDate, amount, notes: input.notes || null },
  });
  await db.classMonthlyFee.updateMany({
    where: { classId: input.classId, month: normalizeMonth(sessionDate) },
    data: { isFinalized: false, finalizedAt: null },
  });
  return session;
}

export async function deleteClassExtraSession(id: string) {
  await requireAdmin();
  id = idSchema.parse(id);
  const session = await db.classExtraSession.delete({ where: { id } });
  await db.classMonthlyFee.updateMany({
    where: { classId: session.classId, month: normalizeMonth(session.sessionDate) },
    data: { isFinalized: false, finalizedAt: null },
  });
  return session;
}
