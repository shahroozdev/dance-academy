import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireContentUser: vi.fn(),
  requireContentOwner: vi.fn(),
  findJob: vi.fn(),
  createJob: vi.fn(),
  updateJob: vi.fn(),
  deleteJob: vi.fn(),
  recordContentAudit: vi.fn(),
  revalidatePublicSite: vi.fn(),
}));

vi.mock("@/actions/content-access", () => ({
  requireContentUser: mocks.requireContentUser,
  requireContentOwner: mocks.requireContentOwner,
}));
vi.mock("@/actions/content-service", () => ({
  recordContentAudit: mocks.recordContentAudit,
  revalidatePublicSite: mocks.revalidatePublicSite,
}));
vi.mock("@/lib/db", () => ({
  db: {
    jobOpening: {
      findUniqueOrThrow: mocks.findJob,
      create: mocks.createJob,
      update: mocks.updateJob,
      delete: mocks.deleteJob,
    },
  },
}));

import { createJobOpening, deleteJobOpening, updateJobOpening } from "@/actions/content-jobs";

const owner = { id: "owner-1", name: "Varsha", role: "OWNER" };
const editor = { id: "editor-1", name: "Asha", role: "EDITOR" };
const input = { title: "Dance Instructor", location: "", employmentType: "Part-time", description: "Teach classes.", applyUrl: "" };
const jobId = "cjld2cjxh0000qzrmn831i7rn";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireContentUser.mockResolvedValue(owner);
  mocks.requireContentOwner.mockResolvedValue(owner);
});

describe("job openings", () => {
  it("saves a new opening with empty optional fields stored as nothing", async () => {
    mocks.createJob.mockResolvedValue({ id: jobId });
    await createJobOpening(input);

    expect(mocks.createJob).toHaveBeenCalledWith({
      data: expect.objectContaining({ title: "Dance Instructor", location: null, employmentType: "Part-time", applyUrl: null }),
      select: { id: true },
    });
  });

  it("takes a live opening off the website when it is changed", async () => {
    mocks.findJob.mockResolvedValue({ status: "PUBLISHED" });
    await expect(updateJobOpening(jobId, input)).resolves.toEqual({ id: jobId, status: "DRAFT" });
    expect(mocks.revalidatePublicSite).toHaveBeenCalledWith(["/careers"]);
  });

  it("does not let an editor change a live opening", async () => {
    mocks.requireContentUser.mockResolvedValue(editor);
    mocks.findJob.mockResolvedValue({ status: "PUBLISHED" });
    await expect(updateJobOpening(jobId, input)).rejects.toThrow();
    expect(mocks.updateJob).not.toHaveBeenCalled();
  });

  it("deletes an opening, records it, and refreshes the website", async () => {
    mocks.deleteJob.mockResolvedValue({ title: "Dance Instructor" });
    await deleteJobOpening(jobId);

    expect(mocks.deleteJob).toHaveBeenCalledWith({ where: { id: jobId }, select: { title: true } });
    expect(mocks.recordContentAudit).toHaveBeenCalledWith(owner, expect.objectContaining({ action: "deleted" }));
    expect(mocks.revalidatePublicSite).toHaveBeenCalledWith(["/careers"]);
  });

  it("only lets an owner delete", async () => {
    mocks.requireContentOwner.mockRejectedValue(new Error("Only a Content Owner can do this."));
    await expect(deleteJobOpening(jobId)).rejects.toThrow();
    expect(mocks.deleteJob).not.toHaveBeenCalled();
  });
});
