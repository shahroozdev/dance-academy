import { getBillingDiscountSettings } from "@/actions/settings-service";

export async function getMultiClassDiscountPct(): Promise<number> {
  const settings = await getBillingDiscountSettings();
  return settings.multiClassDiscountPct;
}

export async function getSiblingDiscountPct(): Promise<number> {
  const settings = await getBillingDiscountSettings();
  return settings.siblingDiscountPct;
}
