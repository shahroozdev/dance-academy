import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  recalculateEnrollmentRangeBills: vi.fn(),
  db: {
    enrollment: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    enrollmentBillingPause: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/actions/access", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/actions/billing-impact", () => ({ recalculateEnrollmentRangeBills: mocks.recalculateEnrollmentRangeBills }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { createEnrollmentBillingPause, updateEnrollmentStartDate } from "@/actions/enrollments";

describe("updateEnrollmentStartDate", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAdmin.mockResolvedValue({ id: "admin" });
    mocks.db.enrollment.findUniqueOrThrow.mockResolvedValue({
      endDate: null,
      class: { firstClassDate: new Date("2026-01-01T00:00:00.000Z") },
    });
    mocks.db.enrollment.update.mockResolvedValue({ id: "enrollment", startDate: new Date("2026-09-10") });
    mocks.recalculateEnrollmentRangeBills.mockResolvedValue({ recalculated: 1, skippedWithPayments: 0 });
  });

  it("stores a corrected historical start date", async () => {
    await updateEnrollmentStartDate("enrollment", { startDate: "2026-09-10" });

    expect(mocks.db.enrollment.update).toHaveBeenCalledWith({
      where: { id: "enrollment" },
      data: { startDate: new Date("2026-09-10") },
    });
    expect(mocks.recalculateEnrollmentRangeBills).toHaveBeenCalledWith("enrollment");
  });

  it("rejects a start date after an ended enrollment's end date", async () => {
    mocks.db.enrollment.findUniqueOrThrow.mockResolvedValue({
      endDate: new Date("2026-09-09"),
      class: { firstClassDate: new Date("2026-01-01T00:00:00.000Z") },
    });

    await expect(updateEnrollmentStartDate("enrollment", { startDate: "2026-09-10" })).rejects.toThrow(
      "cannot be after its end date",
    );
    expect(mocks.db.enrollment.update).not.toHaveBeenCalled();
  });

  it("allows the first billable date to equal the enrollment end date", async () => {
    mocks.db.enrollment.findUniqueOrThrow.mockResolvedValue({
      endDate: new Date("2026-09-10T00:00:00.000Z"),
      class: { firstClassDate: new Date("2026-01-01T00:00:00.000Z") },
    });

    await updateEnrollmentStartDate("enrollment", { startDate: "2026-09-10" });

    expect(mocks.db.enrollment.update).toHaveBeenCalled();
  });

  it("rejects future start dates", async () => {
    await expect(updateEnrollmentStartDate("enrollment", { startDate: "2099-01-01" })).rejects.toThrow(
      "cannot be in the future",
    );
    expect(mocks.db.enrollment.findUniqueOrThrow).not.toHaveBeenCalled();
  });

  it("rejects a first billable date before the class begins", async () => {
    mocks.db.enrollment.findUniqueOrThrow.mockResolvedValue({
      endDate: null,
      class: { firstClassDate: new Date("2026-09-10T00:00:00.000Z") },
    });

    await expect(updateEnrollmentStartDate("enrollment", { startDate: "2026-09-09" })).rejects.toThrow(
      "cannot be before the class's first class date",
    );
    expect(mocks.db.enrollment.update).not.toHaveBeenCalled();
  });
});

describe("createEnrollmentBillingPause", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAdmin.mockResolvedValue({ id: "admin" });
    mocks.db.enrollmentBillingPause.findFirst.mockResolvedValue(null);
    mocks.db.enrollmentBillingPause.create.mockResolvedValue({ id: "pause" });
    mocks.recalculateEnrollmentRangeBills.mockResolvedValue({ recalculated: 1, skippedWithPayments: 0 });
  });

  it("stores an inclusive month range without ending the enrollment", async () => {
    await createEnrollmentBillingPause("enrollment", {
      startMonth: "2026-08",
      endMonth: "2026-09",
      reason: "Vacation",
    });

    expect(mocks.db.enrollmentBillingPause.create).toHaveBeenCalledWith({
      data: {
        enrollmentId: "enrollment",
        startMonth: new Date("2026-08-01T00:00:00.000Z"),
        endMonth: new Date("2026-09-01T00:00:00.000Z"),
        reason: "Vacation",
      },
    });
  });

  it("rejects overlapping pauses", async () => {
    mocks.db.enrollmentBillingPause.findFirst.mockResolvedValue({ id: "existing" });

    await expect(createEnrollmentBillingPause("enrollment", {
      startMonth: "2026-08",
      endMonth: "2026-08",
      reason: "Vacation",
    })).rejects.toThrow("already has a billing pause");
    expect(mocks.db.enrollmentBillingPause.create).not.toHaveBeenCalled();
  });
});
