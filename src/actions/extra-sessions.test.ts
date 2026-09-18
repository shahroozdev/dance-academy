import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  db: {
    classExtraSession: { create: vi.fn(), delete: vi.fn() },
    classMonthlyFee: { updateMany: vi.fn() },
  },
}));

vi.mock("@/actions/access", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { createClassExtraSession, deleteClassExtraSession } from "@/actions/extra-sessions";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue({ id: "admin" });
  mocks.db.classMonthlyFee.updateMany.mockResolvedValue({ count: 1 });
});

describe("extra rehearsal charges", () => {
  it("calculates a dated hourly rehearsal and reopens that class month", async () => {
    mocks.db.classExtraSession.create.mockResolvedValue({ id: "extra" });
    await createClassExtraSession({
      classId: "class",
      sessionDate: "2026-09-20",
      title: "Performance rehearsal",
      billingUnit: "HOUR",
      quantity: 2.5,
      rate: 20,
      notes: "Stage rehearsal",
    });
    expect(mocks.db.classExtraSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ amount: 50, quantity: 2.5, rate: 20 }),
    });
    expect(mocks.db.classMonthlyFee.updateMany).toHaveBeenCalledWith({
      where: { classId: "class", month: new Date("2026-09-01T00:00:00.000Z") },
      data: { isFinalized: false, finalizedAt: null },
    });
  });

  it("reopens the affected class month when a rehearsal is removed", async () => {
    mocks.db.classExtraSession.delete.mockResolvedValue({
      id: "extra",
      classId: "class",
      sessionDate: new Date("2026-09-20T00:00:00.000Z"),
    });
    await deleteClassExtraSession("extra");
    expect(mocks.db.classMonthlyFee.updateMany).toHaveBeenCalledWith({
      where: { classId: "class", month: new Date("2026-09-01T00:00:00.000Z") },
      data: { isFinalized: false, finalizedAt: null },
    });
  });
});
