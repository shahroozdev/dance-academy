"use client";

import { useMemo } from "react";

import {
  tableColumnsRegistry,
  type TableKey,
} from "@/hooks/table-columns-registry";

export function useTableColumns<T extends TableKey>(key: T) {
  return useMemo(() => tableColumnsRegistry[key] ?? [], [key]);
}
