import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  db: {
    enrollment: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/actions/access", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { updateEnrollmentStartDate } from "@/actions/enrollments";

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

  it("rejects future start dates", async () => {
    await expect(updateEnrollmentStartDate("enrollment", { startDate: "2099-01-01" })).rejects.toThrow(
      "cannot be in the future",
    );
    expect(mocks.db.enrollment.findUniqueOrThrow).not.toHaveBeenCalled();
  });
});
