import { getStudioSettings } from "@/actions/settings";

export async function getMultiClassDiscountPct(): Promise<number> {
  const settings = await getStudioSettings();
  return settings.multiClassDiscountPct;
}

export async function getSiblingDiscountPct(): Promise<number> {
  const settings = await getStudioSettings();
  return settings.siblingDiscountPct;
}
