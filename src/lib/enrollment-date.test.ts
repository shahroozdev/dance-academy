import { describe, expect, it } from "vitest";

import {
  enrollmentCalendarDate,
  enrollmentDateInputValue,
  formatEnrollmentCalendarDate,
} from "@/lib/enrollment-date";

describe("enrollment calendar dates", () => {
  it("keeps a database calendar date unchanged", () => {
    expect(enrollmentCalendarDate("2026-09-10T00:00:00.000Z").toISOString()).toBe(
      "2026-09-10T00:00:00.000Z",
    );
    expect(formatEnrollmentCalendarDate("2026-09-10T00:00:00.000Z")).toBe("9/10/2026");
    expect(enrollmentDateInputValue("2026-09-10T00:00:00.000Z")).toBe("2026-09-10");
  });
});
