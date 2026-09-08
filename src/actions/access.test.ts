import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), findUnique: vi.fn() }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: { adminUser: { findUnique: mocks.findUnique } } }));

import { getActiveAdmin, requireAdmin, requireOwner } from "@/actions/access";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "admin" } });
});

describe("admin session recovery", () => {
  it.each([
    ["removed", null],
    ["disabled", { id: "admin", role: "OWNER", isActive: false }],
    ["unsupported role", { id: "admin", role: "OTHER", isActive: true }],
  ])("allows a %s admin to reach login and redirects protected access", async (_, admin) => {
    mocks.findUnique.mockResolvedValue(admin);
    expect(await getActiveAdmin()).toBeNull();
    await expect(requireAdmin()).rejects.toMatchObject({
      digest: expect.stringContaining("/admin/login"),
    });
  });

  it("redirects missing sessions without querying the database", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toMatchObject({
      digest: expect.stringContaining("/admin/login"),
    });
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it.each(["OWNER", "STAFF"])("accepts active %s accounts", async (role) => {
    mocks.findUnique.mockResolvedValue({ id: "admin", role, isActive: true });
    expect(await requireAdmin()).toEqual({ id: "admin", role });
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { id: "admin" } });
  });

  it("preserves owner-only restrictions", async () => {
    mocks.findUnique.mockResolvedValue({ id: "admin", role: "STAFF", isActive: true });
    await expect(requireOwner()).rejects.toThrow("Only the studio owner");
  });

  it("does not hide database failures as sign-in problems", async () => {
    mocks.findUnique.mockRejectedValue(new Error("Database unavailable"));
    await expect(requireAdmin()).rejects.toThrow("Database unavailable");
  });
});
