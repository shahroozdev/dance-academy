function readPct(envVar: string, fallback: number): number {
  const raw = process.env[envVar];
  const value = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export function getMultiClassDiscountPct(): number {
  return readPct("DISCOUNT_MULTI_CLASS_PCT", 0.05);
}

export function getSiblingDiscountPct(): number {
  return readPct("DISCOUNT_SIBLING_PCT", 0.05);
}
