import { describe, expect, it } from "vitest";

import {
  allowedStatusChanges,
  assertCanRevise,
  assertStatusChange,
  canRevise,
  statusAfterRevision,
} from "@/lib/content-publishing";

describe("who may change what is live", () => {
  it.each(["PUBLISHED", "DRAFT", "ARCHIVED"] as const)("never lets an editor move content to %s", (to) => {
    expect(() => assertStatusChange("EDITOR", to === "DRAFT" ? "PUBLISHED" : "DRAFT", to)).toThrow("Only a Content Owner");
  });

  it("lets an owner publish, unpublish, archive, and restore", () => {
    expect(() => assertStatusChange("OWNER", "DRAFT", "PUBLISHED")).not.toThrow();
    expect(() => assertStatusChange("OWNER", "PUBLISHED", "DRAFT")).not.toThrow();
    expect(() => assertStatusChange("OWNER", "PUBLISHED", "ARCHIVED")).not.toThrow();
    expect(() => assertStatusChange("OWNER", "ARCHIVED", "DRAFT")).not.toThrow();
  });

  it("does not let archived content go straight back onto the website", () => {
    expect(allowedStatusChanges("ARCHIVED")).toEqual(["DRAFT"]);
    expect(() => assertStatusChange("OWNER", "ARCHIVED", "PUBLISHED")).toThrow("cannot be changed");
  });

  it("rejects a change to the status the content already has", () => {
    expect(() => assertStatusChange("OWNER", "PUBLISHED", "PUBLISHED")).toThrow("cannot be changed");
  });
});

describe("revising content", () => {
  it("lets an editor work on drafts only", () => {
    expect(canRevise("EDITOR", "DRAFT")).toBe(true);
    expect(canRevise("EDITOR", "PUBLISHED")).toBe(false);
    expect(canRevise("EDITOR", "ARCHIVED")).toBe(false);
    expect(() => assertCanRevise("EDITOR", "PUBLISHED")).toThrow("Only a Content Owner can change published content");
  });

  it("lets an owner revise content in any state", () => {
    for (const status of ["DRAFT", "PUBLISHED", "ARCHIVED"] as const) expect(canRevise("OWNER", status)).toBe(true);
  });

  it("returns published content to draft, and leaves drafts and archived content where they are", () => {
    expect(statusAfterRevision("PUBLISHED")).toBe("DRAFT");
    expect(statusAfterRevision("DRAFT")).toBe("DRAFT");
    expect(statusAfterRevision("ARCHIVED")).toBe("ARCHIVED");
  });
});
