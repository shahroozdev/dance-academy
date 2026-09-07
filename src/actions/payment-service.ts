import "server-only";

import type { PaymentCreateInput } from "@/actions/payments.schema";
import { serializableTransaction } from "@/actions/transaction";
import { computeBillingStatus, round2 } from "@/lib/billing";

export async function recordBillTransaction(data: PaymentCreateInput, refund: boolean) {
  return serializableTransaction(async (tx) => {
    const billing = await tx.monthlyStudentBilling.findUniqueOrThrow({ where: { id: data.billingId } });
    const aggregate = await tx.payment.aggregate({ where: { billingId: data.billingId }, _sum: { amount: true } });
    const previouslyPaid = round2(Number(aggregate._sum.amount ?? 0));
    const finalAmountDue = Number(billing.finalAmountDue);
    const refundable = round2(Math.min(previouslyPaid, Math.max(0, previouslyPaid - finalAmountDue)));
    if (refund && data.amount > refundable) throw new Error("Refund cannot exceed the collected overpayment. Adjust the bill first if its fee needs reducing.");

    // Negative ledger entries represent cash returned; report sums automatically net these out on their payment date.
    const amount = refund ? -data.amount : data.amount;
    await tx.payment.create({
      data: {
        billingId: data.billingId, paymentDate: new Date(data.paymentDate), amount, method: data.method,
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
