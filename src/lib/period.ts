import { normalizeMonth } from "@/lib/billing";

export type Period = { type: "MONTH"; month: string } | { type: "YEAR"; year: number } | { type: "ALL_TIME" };

// Every boundary is UTC, matching normalizeMonth's timezone-independence rationale in lib/billing.ts.
export function periodDateFilter(period: Period): { gte?: Date; lt?: Date } {
  if (period.type === "MONTH") {
    const start = normalizeMonth(period.month);
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
    return { gte: start, lt: end };
  }
  if (period.type === "YEAR") {
    return {
      gte: new Date(Date.UTC(period.year, 0, 1)),
      lt: new Date(Date.UTC(period.year + 1, 0, 1)),
    };
  }
  return {};
}
