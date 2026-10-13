import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ contentAuth: vi.fn(), findUnique: vi.fn() }));
vi.mock("@/content-auth", () => ({ contentAuth: mocks.contentAuth }));
vi.mock("@/lib/db", () => ({ db: { contentUser: { findUnique: mocks.findUnique } } }));

import { getActiveContentUser, requireContentOwner, requireContentUser } from "@/actions/content-access";

const toLogin = { digest: expect.stringContaining("/content/login") };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.contentAuth.mockResolvedValue({ user: { id: "user", portal: "content" } });
});

describe("content portal access", () => {
  it("rejects a session issued for the Studio Admin portal without reading the database", async () => {
    mocks.contentAuth.mockResolvedValue({ user: { id: "admin", portal: "admin" } });

    expect(await getActiveContentUser()).toBeNull();
    await expect(requireContentUser()).rejects.toMatchObject(toLogin);
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });

  it("sends a visitor with no session to the content login", async () => {
    mocks.contentAuth.mockResolvedValue(null);

    await expect(requireContentUser()).rejects.toMatchObject(toLogin);
  });

  it.each([
    ["removed", null],
    ["deactivated", { id: "user", name: "Asha", role: "OWNER", isActive: false }],
    ["unsupported role", { id: "user", name: "Asha", role: "STAFF", isActive: true }],
  ])("rechecks the account on every call and rejects a %s user", async (_, contentUser) => {
    mocks.findUnique.mockResolvedValue(contentUser);

    expect(await getActiveContentUser()).toBeNull();
    await expect(requireContentUser()).rejects.toMatchObject(toLogin);
  });

  it.each(["OWNER", "EDITOR"])("accepts an active %s", async (role) => {
    mocks.findUnique.mockResolvedValue({ id: "user", name: "Asha", role, isActive: true, passwordHash: "secret" });

    // Only what the portal needs — never the password hash or email.
    expect(await requireContentUser()).toEqual({ id: "user", name: "Asha", role });
  });

  it("keeps owner-only actions away from editors", async () => {
    mocks.findUnique.mockResolvedValue({ id: "user", name: "Asha", role: "EDITOR", isActive: true });

    await expect(requireContentOwner()).rejects.toThrow("Only a Content Owner");
  });
});
