import { describe, expect, it } from "vitest";

import { validateListQuery } from "@/actions/validation.schema";

describe("validateListQuery", () => {
  it("accepts the billing manual-review filter", () => {
    expect(() => validateListQuery({ needsManualReview: true, pageSize: 5000 })).not.toThrow();
  });

  it("continues to reject unknown list filters", () => {
    expect(() => validateListQuery({ unknownFilter: true })).toThrow();
  });
});
