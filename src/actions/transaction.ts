import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

// Only database work belongs here: external sends must happen after commit, never on retries.
export async function serializableTransaction<T>(
  work: (tx: Prisma.TransactionClient) => Promise<T>,
  options?: { timeout?: number },
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(work, {
        isolationLevel: "Serializable",
        timeout: options?.timeout ?? 30_000,
      });
    } catch (error) {
      const transactionError = error as Error & {
        code?: string;
        cause?: { kind?: string; originalCode?: string };
      };
      const retryable = transactionError.code === "P2034" ||
        (transactionError.code === "P2028" && transactionError.message.includes("Unable to start a transaction")) ||
        transactionError.cause?.kind === "TransactionWriteConflict" ||
        transactionError.cause?.originalCode === "40001";
      if (attempt >= 3 || !retryable) throw error;
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 100));
    }
  }
}
