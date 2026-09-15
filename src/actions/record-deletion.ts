import "server-only";

import type { Prisma } from "@/generated/prisma/client";

export async function deleteStudentRecords(tx: Prisma.TransactionClient, studentIds: string[]) {
  if (studentIds.length === 0) return;

  const billingIds = (await tx.monthlyStudentBilling.findMany({
    where: { studentId: { in: studentIds } },
    select: { id: true },
  })).map((billing) => billing.id);

  await tx.payment.deleteMany({ where: { billingId: { in: billingIds } } });
  await tx.monthlyStudentBilling.deleteMany({ where: { id: { in: billingIds } } });
  await tx.registrationRequest.deleteMany({ where: { matchedStudentId: { in: studentIds } } });
  await tx.enrollment.deleteMany({ where: { studentId: { in: studentIds } } });
  await tx.student.deleteMany({ where: { id: { in: studentIds } } });
}
