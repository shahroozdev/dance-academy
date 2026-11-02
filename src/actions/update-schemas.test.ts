import { describe, expect, it } from "vitest";

import { classUpdateSchema } from "@/actions/classes.schema";
import { programCreateSchema, programUpdateSchema } from "@/actions/programs.schema";
import { teacherCreateSchema, teacherUpdateSchema } from "@/actions/teachers.schema";

// Zod applies a `.default()` even inside `.partial()`. An update that omits a defaulted field must
// leave it out, otherwise saving one field silently reactivates a record or resets its pricing.
describe("partial update schemas keep omitted fields omitted", () => {
  it("does not reactivate a program when only its name is saved", () => {
    expect(programUpdateSchema.parse({ name: "Jazz" })).toEqual({ name: "Jazz" });
    expect(programUpdateSchema.parse({ isActive: false })).toEqual({ isActive: false });
  });

  it("does not reactivate a teacher when only their name is saved", () => {
    expect(teacherUpdateSchema.parse({ name: "Meera Iyer" })).toEqual({ name: "Meera Iyer" });
    expect(teacherUpdateSchema.parse({ isActive: false })).toEqual({ isActive: false });
  });

  it("does not reset a class's pricing type or discount eligibility", () => {
    expect(classUpdateSchema.parse({ name: "Onam Dance 2026 SJ" })).toEqual({ name: "Onam Dance 2026 SJ" });
  });

  it("still defaults new programs and teachers to active", () => {
    expect(programCreateSchema.parse({ name: "Jazz" }).isActive).toBe(true);
    expect(teacherCreateSchema.parse({ name: "Meera Iyer" }).isActive).toBe(true);
  });
});
