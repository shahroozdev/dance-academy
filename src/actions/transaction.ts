import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

// Only database work belongs here: external sends must happen after commit, never on retries.
export async function serializableTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(work, { isolationLevel: "Serializable", timeout: 30000 });
    } catch (error) {
      if (attempt >= 3 || !(error instanceof Error) || !("code" in error) || error.code !== "P2034") throw error;
    }
  }
}
