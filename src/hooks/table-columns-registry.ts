import type { TableColumn } from "@/types/table";

export type TableKey = "families" | "students" | "classes" | "outstandingFees";

export type TableColumnsMap = Record<TableKey, TableColumn[]>;

// One typed place for every list page's columns (AGENTS.md Rule 16). Pages resolve their set with
// useTableColumns(key) instead of writing <TableHead>s inline.
export const tableColumnsRegistry: Partial<TableColumnsMap> = {
  outstandingFees: [
    { key: "student", label: "Student" },
    { key: "family", label: "Family" },
    { key: "month", label: "Month" },
    { key: "classes", label: "Still due by class" },
    { key: "paid", label: "Paid", className: "text-right" },
    { key: "balance", label: "Still due", className: "text-right" },
  ],
};
