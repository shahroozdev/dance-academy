"use client";

import { Card } from "@/components/common/card";
import { Skeleton } from "@/components/common/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/common/table";
import { getErrorMessage } from "@/components/content/editor-parts";
import { useRouter } from "@/hooks/useRouter";

import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type ContentColumn<Row> = { header: string; cell: (row: Row) => ReactNode; className?: string };

type ContentTableProps<Row> = {
  icon: LucideIcon;
  title: string;
  rows: Row[] | undefined;
  isLoading: boolean;
  error?: unknown;
  emptyMessage: string;
  columns: ContentColumn<Row>[];
  rowKey: (row: Row) => string;
  /** When given, a row opens this address on click. */
  rowHref?: (row: Row) => string;
  /** When given, a row calls this on click instead (for a list that opens a window in place). */
  onRowClick?: (row: Row) => void;
  footer?: ReactNode;
};

/** The list card used by every Content Portal section: skeleton, empty state, then the table. */
export function ContentTable<Row>({
  icon: Icon,
  title,
  rows,
  isLoading,
  error,
  emptyMessage,
  columns,
  rowKey,
  rowHref,
  onRowClick,
  footer,
}: ContentTableProps<Row>) {
  const router = useRouter();
  const hasRows = !!rows && rows.length > 0;
  const openRow = (row: Row) => (onRowClick ? onRowClick(row) : rowHref && router.push(rowHref(row)));
  const isClickable = !!onRowClick || !!rowHref;

  return (
    <Card
      header={
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Icon className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium">{title}</span>
          </div>
          {rows ? <span className="text-sm text-muted-foreground">{rows.length} shown</span> : null}
        </div>
      }
      headerClassName="border-b"
      contentClassName="flex min-h-0 flex-1 flex-col p-2"
    >
      {isLoading && !rows && (
        <div className="space-y-2 p-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      )}
      {Boolean(error) && (
        <p role="alert" className="p-4 text-sm text-destructive">
          {getErrorMessage(error, "This list could not be loaded. Please refresh the page.")}
        </p>
      )}
      {!isLoading && !error && !hasRows && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <Icon className="size-10 text-muted-foreground/50" />
          <p className="max-w-sm text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      )}
      {hasRows && (
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.header} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={rowKey(row)}
                className={isClickable ? "cursor-pointer" : undefined}
                onClick={isClickable ? () => openRow(row) : undefined}
              >
                {columns.map((column) => (
                  <TableCell key={column.header} className={column.className}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      {footer}
    </Card>
  );
}
