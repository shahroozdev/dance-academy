"use client";

import { useMemo } from "react";

import {
  tableColumnsRegistry,
  type TableKey,
} from "@/hooks/table-columns-registry";
import type { TableColumn } from "@/types/table";

export function useTableColumns<T extends TableKey>(key: T): TableColumn[] {
  return useMemo(() => tableColumnsRegistry[key] ?? [], [key]);
}
