import type { ClassListItem } from "@/actions/classes";
import type { FamilyListItem } from "@/actions/families";
import type { StudentListItem } from "@/actions/students";

export type TableKey = "families" | "students" | "classes";

export type TableColumnsMap = {
  families: unknown[];
  students: unknown[];
  classes: unknown[];
};

// Placeholder — columns will be populated when list pages are built.
export const tableColumnsRegistry: Partial<TableColumnsMap> = {};
