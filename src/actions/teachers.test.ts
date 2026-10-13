import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findTeachers: vi.fn(), findClasses: vi.fn(), auth: vi.fn() }));

vi.mock("@/lib/db", () => ({
  db: { teacher: { findMany: mocks.findTeachers }, class: { findMany: mocks.findClasses } },
}));
vi.mock("@/auth", () => ({ auth: mocks.auth }));

import { getPublicInstructors } from "@/actions/teachers";

beforeEach(() => {
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.auth.mockResolvedValue(null);
});

describe("public instructors list", () => {
  it("works without a signed-in user and returns each active teacher with the programs they teach", async () => {
    mocks.findTeachers.mockResolvedValue([
      { id: "t1", name: "Meera Iyer" },
      { id: "t2", name: "Rohan Verma" },
    ]);
    mocks.findClasses.mockResolvedValue([
      { teacherId: "t1", program: { name: "Mohiniyattam" } },
      { teacherId: "t1", program: { name: "Bharatanatyam" } },
      { teacherId: "t1", program: { name: "Bharatanatyam" } },
    ]);

    await expect(getPublicInstructors()).resolves.toEqual([
      { name: "Meera Iyer", programs: ["Bharatanatyam", "Mohiniyattam"] },
      { name: "Rohan Verma", programs: [] },
    ]);
  });

  it("asks only for active teachers and never selects contact details or notes", async () => {
    mocks.findTeachers.mockResolvedValue([]);

    await getPublicInstructors();

    const query = mocks.findTeachers.mock.calls[0][0];
    expect(query.where).toEqual({ isActive: true });
    expect(query.select).toEqual({ id: true, name: true });
  });

  it("returns an empty list instead of failing when the teachers cannot be loaded", async () => {
    mocks.findTeachers.mockRejectedValue(new Error("database unreachable"));

    await expect(getPublicInstructors()).resolves.toEqual([]);
  });

  it("still lists the teachers when only their programs cannot be loaded", async () => {
    mocks.findTeachers.mockResolvedValue([{ id: "t1", name: "Meera Iyer" }]);
    mocks.findClasses.mockRejectedValue(new Error("relation does not exist"));

    await expect(getPublicInstructors()).resolves.toEqual([{ name: "Meera Iyer", programs: [] }]);
  });
});
