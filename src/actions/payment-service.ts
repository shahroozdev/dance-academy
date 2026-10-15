import "server-only";

import type { PaymentCreateInput, PaymentUpdateInput } from "@/actions/payments.schema";
import { serializableTransaction } from "@/actions/transaction";
import { computeBillingStatus, round2 } from "@/lib/billing";

export async function recordBillTransaction(data: PaymentCreateInput, refund: boolean) {
  return serializableTransaction(async (tx) => {
    const billing = await tx.monthlyStudentBilling.findUniqueOrThrow({ where: { id: data.billingId } });
    if (data.classId) {
      const belongsToBill = await tx.monthlyBillingLineItem.findFirst({
        where: { billingId: data.billingId, enrollment: { classId: data.classId } },
        select: { id: true },
      });
      if (!belongsToBill) throw new Error("Select a class included in this monthly bill.");
    }
    const aggregate = await tx.payment.aggregate({ where: { billingId: data.billingId }, _sum: { amount: true } });
    const previouslyPaid = round2(Number(aggregate._sum.amount ?? 0));
    const finalAmountDue = Number(billing.finalAmountDue);
    const refundable = round2(Math.min(previouslyPaid, Math.max(0, previouslyPaid - finalAmountDue)));
    if (refund && data.amount > refundable) throw new Error("Refund cannot exceed the collected overpayment. Adjust the bill first if its fee needs reducing.");

    // Negative ledger entries represent cash returned; report sums automatically net these out on their payment date.
    const amount = refund ? -data.amount : data.amount;
    await tx.payment.create({
      data: {
        billingId: data.billingId, classId: data.classId || null, paymentDate: new Date(`${data.paymentDate}T00:00:00.000Z`), amount, method: data.method,
        reference: data.reference || null, notes: refund ? `Refund: ${data.notes}` : data.notes || null,
      },
    });
    const amountPaid = round2(previouslyPaid + amount);
    const updated = await tx.monthlyStudentBilling.update({
      where: { id: billing.id },
      data: { amountPaid, balance: round2(finalAmountDue - amountPaid), status: computeBillingStatus(finalAmountDue, amountPaid) },
    });
    return { id: updated.id };
  });
}

export async function updateBillPayment(id: string, data: PaymentUpdateInput) {
  return serializableTransaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({ where: { id } });
    if (data.classId) {
      const belongsToBill = await tx.monthlyBillingLineItem.findFirst({
        where: { billingId: payment.billingId, enrollment: { classId: data.classId } },
        select: { id: true },
      });
      if (!belongsToBill) throw new Error("Select a class included in this monthly bill.");
    }
    await tx.payment.update({
      where: { id },
      data: {
        classId: data.classId || null,
        paymentDate: new Date(`${data.paymentDate}T00:00:00.000Z`),
        amount: data.amount,
        method: data.method,
        reference: data.reference || null,
        notes: data.notes || null,
      },
    });
    const billing = await tx.monthlyStudentBilling.findUniqueOrThrow({ where: { id: payment.billingId } });
    const aggregate = await tx.payment.aggregate({ where: { billingId: payment.billingId }, _sum: { amount: true } });
    const amountPaid = round2(Number(aggregate._sum.amount ?? 0));
    const finalAmountDue = Number(billing.finalAmountDue);
    await tx.monthlyStudentBilling.update({
      where: { id: payment.billingId },
      data: {
        amountPaid,
        balance: round2(finalAmountDue - amountPaid),
        status: computeBillingStatus(finalAmountDue, amountPaid),
      },
    });
    return { id, billingId: payment.billingId };
  });
}
