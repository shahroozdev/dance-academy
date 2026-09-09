import { describe, expect, it } from "vitest";

import { formatStudentDuration, formatStudentJoinDate } from "@/lib/student-duration";

describe("formatStudentDuration", () => {
  it("formats completed years and months", () => {
    expect(formatStudentDuration("2024-01-10T00:00:00.000Z", new Date("2025-09-10T00:00:00.000Z")))
      .toBe("1 year, 8 months");
  });

  it("does not count an incomplete calendar month", () => {
    expect(formatStudentDuration("2024-01-20T00:00:00.000Z", new Date("2025-09-10T00:00:00.000Z")))
      .toBe("1 year, 7 months");
  });

  it("uses readable singular and short-duration labels", () => {
    expect(formatStudentDuration("2025-08-10T00:00:00.000Z", new Date("2025-09-10T00:00:00.000Z")))
      .toBe("1 month");
    expect(formatStudentDuration("2025-09-01T00:00:00.000Z", new Date("2025-09-10T00:00:00.000Z")))
      .toBe("Less than 1 month");
  });

  it("returns a dash for an invalid source date", () => {
    expect(formatStudentDuration("not-a-date")).toBe("—");
  });
});

describe("formatStudentJoinDate", () => {
  it("shows the saved calendar date without a timezone shift", () => {
    expect(formatStudentJoinDate("2024-10-03T00:00:00.000Z")).toBe("10/3/2024");
  });

  it("uses a placeholder for an invalid date", () => {
    expect(formatStudentJoinDate("invalid")).toBe("—");
  });
});
