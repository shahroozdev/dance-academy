import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
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
vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { createEnrollmentBillingPause, updateEnrollmentStartDate } from "@/actions/enrollments";

describe("updateEnrollmentStartDate", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAdmin.mockResolvedValue({ id: "admin" });
    mocks.db.enrollment.findUniqueOrThrow.mockResolvedValue({ endDate: null });
    mocks.db.enrollment.update.mockResolvedValue({ id: "enrollment", startDate: new Date("2026-09-10") });
  });

  it("stores a corrected historical start date", async () => {
    await updateEnrollmentStartDate("enrollment", { startDate: "2026-09-10" });

    expect(mocks.db.enrollment.update).toHaveBeenCalledWith({
      where: { id: "enrollment" },
      data: { startDate: new Date("2026-09-10") },
    });
  });

  it("rejects a start date after an ended enrollment's end date", async () => {
    mocks.db.enrollment.findUniqueOrThrow.mockResolvedValue({ endDate: new Date("2026-09-09") });

    await expect(updateEnrollmentStartDate("enrollment", { startDate: "2026-09-10" })).rejects.toThrow(
      "cannot be after its end date",
    );
    expect(mocks.db.enrollment.update).not.toHaveBeenCalled();
  });

  it("allows the first billable date to equal the enrollment end date", async () => {
    mocks.db.enrollment.findUniqueOrThrow.mockResolvedValue({
      endDate: new Date("2026-09-10T00:00:00.000Z"),
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
});

describe("createEnrollmentBillingPause", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.requireAdmin.mockResolvedValue({ id: "admin" });
    mocks.db.enrollmentBillingPause.findFirst.mockResolvedValue(null);
    mocks.db.enrollmentBillingPause.create.mockResolvedValue({ id: "pause" });
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
