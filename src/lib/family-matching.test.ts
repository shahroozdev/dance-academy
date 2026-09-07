import { describe, expect, it } from "vitest";

import { matchRegistrationFamily } from "@/lib/family-matching";

describe("registration family matching", () => {
  const families = [{ id: "family", phone: "(555) 123-4567", email: "Parent@Example.test" }];
  it("matches equivalent phone formats", () => expect(matchRegistrationFamily(families, "+1 555 123 4567", null)?.id).toBe("family"));
  it("matches email regardless of capitalization", () => expect(matchRegistrationFamily(families, "5559998888", "parent@example.test")?.id).toBe("family"));
  it("creates no match based only on an unrelated contact", () => expect(matchRegistrationFamily(families, "5559998888", null)).toBeNull());
  it("refuses to choose between conflicting family matches", () => {
    const conflicting = [...families, { id: "other", phone: "5559998888", email: "other@example.test" }];
    expect(() => matchRegistrationFamily(conflicting, "5559998888", "parent@example.test")).toThrow("more than one family");
  });
});
