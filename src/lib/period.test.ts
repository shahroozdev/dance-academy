import { describe, expect, it } from "vitest";

import { periodDateFilter } from "@/lib/period";

describe("periodDateFilter", () => {
  it("MONTH resolves to [1st of month, 1st of next month) in UTC", () => {
    const filter = periodDateFilter({ type: "MONTH", month: "2026-09" });
    expect(filter.gte?.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(filter.lt?.toISOString()).toBe("2026-10-01T00:00:00.000Z");
  });

  it("MONTH handles a December-to-January year rollover", () => {
    const filter = periodDateFilter({ type: "MONTH", month: "2026-12" });
    expect(filter.gte?.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(filter.lt?.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("YEAR resolves to [Jan 1, Jan 1 of next year) in UTC", () => {
    const filter = periodDateFilter({ type: "YEAR", year: 2026 });
    expect(filter.gte?.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(filter.lt?.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("ALL_TIME has no bounds", () => {
    const filter = periodDateFilter({ type: "ALL_TIME" });
    expect(filter.gte).toBeUndefined();
    expect(filter.lt).toBeUndefined();
  });
});
