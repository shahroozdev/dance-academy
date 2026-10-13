import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireContentOwner: vi.fn(),
  findFirst: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  count: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  recordContentAudit: vi.fn(),
}));

vi.mock("@/actions/content-access", () => ({ requireContentOwner: mocks.requireContentOwner }));
vi.mock("@/actions/content-service", () => ({ recordContentAudit: mocks.recordContentAudit }));
vi.mock("@/lib/db", () => ({
  db: {
    contentUser: {
      findFirst: mocks.findFirst,
      findUniqueOrThrow: mocks.findUniqueOrThrow,
      count: mocks.count,
      create: mocks.create,
      update: mocks.update,
    },
  },
}));

import { createContentUser, setContentUserPassword, updateContentUser } from "@/actions/content-users";

const owner = { id: "owner-1", name: "Varsha", role: "OWNER" };
const saved = { id: "u1", name: "Asha", email: "asha@example.test", role: "EDITOR", isActive: true, createdAt: new Date() };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireContentOwner.mockResolvedValue(owner);
  mocks.findFirst.mockResolvedValue(null);
  mocks.create.mockResolvedValue(saved);
  mocks.update.mockResolvedValue(saved);
});

describe("keeping the portal reachable", () => {
  it.each([
    ["turned off", { name: "Varsha", role: "OWNER" as const, isActive: false }],
    ["made an editor", { name: "Varsha", role: "EDITOR" as const, isActive: true }],
  ])("refuses when the only active owner would be %s", async (_, change) => {
    mocks.findUniqueOrThrow.mockResolvedValue({ role: "OWNER", isActive: true });
    mocks.count.mockResolvedValue(0);

    await expect(updateContentUser("owner-1", change)).rejects.toThrow("at least one active Content Owner");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("allows it when another active owner remains", async () => {
    mocks.findUniqueOrThrow.mockResolvedValue({ role: "OWNER", isActive: true });
    mocks.count.mockResolvedValue(1);

    await updateContentUser("owner-1", { name: "Varsha", role: "OWNER", isActive: false });

    expect(mocks.count).toHaveBeenCalledWith({ where: { role: "OWNER", isActive: true, id: { not: "owner-1" } } });
    expect(mocks.update).toHaveBeenCalled();
  });

  it("does not count owners when an editor is turned off", async () => {
    mocks.findUniqueOrThrow.mockResolvedValue({ role: "EDITOR", isActive: true });

    await updateContentUser("u1", { name: "Asha", role: "EDITOR", isActive: false });

    expect(mocks.count).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalled();
  });
});

describe("content user accounts", () => {
  const newUser = { name: "Asha", email: "Asha@Example.test", role: "EDITOR" as const, password: "a-long-enough-password" };

  it("stores a hash, never the password, and never hands the hash back", async () => {
    await createContentUser(newUser);

    const { data, select } = mocks.create.mock.calls[0][0];
    expect(data.email).toBe("asha@example.test");
    expect(data.passwordHash).not.toContain(newUser.password);
    expect(data.passwordHash).toMatch(/^\$2[aby]\$/);
    expect(select).not.toHaveProperty("passwordHash");
  });

  it("refuses a second account with the same email, whatever the capital letters", async () => {
    mocks.findFirst.mockResolvedValue({ id: "existing" });

    await expect(createContentUser(newUser)).rejects.toThrow("already exists");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("refuses a short password", async () => {
    await expect(createContentUser({ ...newUser, password: "short" })).rejects.toThrow();
    await expect(setContentUserPassword("u1", { password: "short" })).rejects.toThrow();
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("never writes a password into the history", async () => {
    await setContentUserPassword("u1", { password: "a-brand-new-password" });

    expect(JSON.stringify(mocks.recordContentAudit.mock.calls)).not.toContain("a-brand-new-password");
  });
});
