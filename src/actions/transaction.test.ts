import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ transaction: vi.fn() }));

vi.mock("@/lib/db", () => ({ db: { $transaction: mocks.transaction } }));

import { serializableTransaction } from "@/actions/transaction";

beforeEach(() => {
  vi.resetAllMocks();
});

describe("serializableTransaction", () => {
  it("retries Prisma adapter write conflicts", async () => {
    const conflict = Object.assign(new Error("TransactionWriteConflict"), {
      cause: { kind: "TransactionWriteConflict", originalCode: "40001" },
    });
    mocks.transaction.mockRejectedValueOnce(conflict).mockResolvedValueOnce("saved");

    await expect(serializableTransaction(async () => "saved")).resolves.toBe("saved");
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
  });

  it("does not retry unrelated failures", async () => {
    mocks.transaction.mockRejectedValue(new Error("Validation failed"));

    await expect(serializableTransaction(async () => "saved")).rejects.toThrow("Validation failed");
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("retries temporary transaction-start capacity errors", async () => {
    const capacityError = Object.assign(new Error("Unable to start a transaction in the given time."), {
      code: "P2028",
    });
    mocks.transaction.mockRejectedValueOnce(capacityError).mockResolvedValueOnce("saved");

    await expect(serializableTransaction(async () => "saved")).resolves.toBe("saved");
    expect(mocks.transaction).toHaveBeenCalledTimes(2);
  });
});
