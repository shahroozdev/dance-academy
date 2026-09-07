import "server-only";
import { db } from "@/lib/db";

export async function getBillingDiscountSettings() {
  const settings = await db.studioSettings.findUnique({ where: { id: "default" } });
  return { multiClassDiscountPct: Number(settings?.multiClassDiscountPct ?? 0.05), siblingDiscountPct: Number(settings?.siblingDiscountPct ?? 0.05) };
}
