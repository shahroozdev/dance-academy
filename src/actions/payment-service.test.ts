import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    payment: { findUniqueOrThrow: vi.fn(), update: vi.fn(), aggregate: vi.fn() },
    monthlyBillingLineItem: { findFirst: vi.fn() },
    monthlyStudentBilling: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
  };
  return { tx, transaction: vi.fn() };
});

vi.mock("@/lib/db", () => ({ db: { $transaction: mocks.transaction } }));

import { updateBillPayment } from "@/actions/payment-service";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.transaction.mockImplementation((work: (tx: typeof mocks.tx) => Promise<unknown>) => work(mocks.tx));
  mocks.tx.payment.findUniqueOrThrow.mockResolvedValue({ id: "payment", billingId: "bill" });
  mocks.tx.monthlyBillingLineItem.findFirst.mockResolvedValue({ id: "line" });
  mocks.tx.monthlyStudentBilling.findUniqueOrThrow.mockResolvedValue({ id: "bill", finalAmountDue: 80 });
  mocks.tx.payment.aggregate.mockResolvedValue({ _sum: { amount: 60 } });
});

describe("payment corrections", () => {
  it("updates its class allocation and rebuilds the monthly balance from the ledger", async () => {
    await updateBillPayment("payment", {
      classId: "class",
      paymentDate: "2026-09-10",
      amount: 60,
      method: "ZELLE",
      reference: "confirmation",
      notes: "September fee",
    });

    expect(mocks.tx.payment.update).toHaveBeenCalledWith({
      where: { id: "payment" },
      data: {
        classId: "class",
        paymentDate: new Date("2026-09-10T00:00:00.000Z"),
        amount: 60,
        method: "ZELLE",
        reference: "confirmation",
        notes: "September fee",
      },
    });
    expect(mocks.tx.monthlyStudentBilling.update).toHaveBeenCalledWith({
      where: { id: "bill" },
      data: { amountPaid: 60, balance: 20, status: "PARTIAL" },
    });
  });

  it("rejects assigning a payment to a class outside its monthly bill", async () => {
    mocks.tx.monthlyBillingLineItem.findFirst.mockResolvedValue(null);

    await expect(updateBillPayment("payment", {
      classId: "another-class",
      paymentDate: "2026-09-10",
      amount: 60,
      method: "CASH",
    })).rejects.toThrow("included in this monthly bill");
    expect(mocks.tx.payment.update).not.toHaveBeenCalled();
  });
});
