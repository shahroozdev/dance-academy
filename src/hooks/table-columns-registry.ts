export type TableKey = "families" | "students" | "classes";

export type TableColumnsMap = {
  families: unknown[];
  students: unknown[];
  classes: unknown[];
};

// Placeholder — columns will be populated when list pages are built.
export const tableColumnsRegistry: Partial<TableColumnsMap> = {};
