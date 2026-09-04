"use client";

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { createContext, useContext, useRef, type ComponentProps, type ReactNode } from "react";

import {
  Table as UITable,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead as UITableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const TableResizableContext = createContext(true);

type TableProps = ComponentProps<typeof UITable> & { resizable?: boolean };

function Table({ resizable = true, className, ...props }: TableProps) {
  return (
    <TableResizableContext.Provider value={resizable}>
      <UITable className={className} {...props} />
    </TableResizableContext.Provider>
  );
}

type SortDirection = "asc" | "desc" | null;

type TableHeadProps = ComponentProps<typeof UITableHead> & {
  resizable?: boolean;
  sortable?: boolean;
  sortDirection?: SortDirection;
  onSort?: () => void;
};

function TableHead({
  resizable,
  sortable = false,
  sortDirection = null,
  onSort,
  className,
  children,
  ...props
}: TableHeadProps) {
  const tableResizable = useContext(TableResizableContext);
  const isResizable = resizable ?? tableResizable;
  const headRef = useRef<HTMLTableCellElement>(null);

  const handleResizeStart = (event: React.PointerEvent<HTMLDivElement>) => {
    const head = headRef.current;
    if (!head) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = head.offsetWidth;

    const handleMove = (moveEvent: PointerEvent) => {
      head.style.width = `${Math.max(60, startWidth + (moveEvent.clientX - startX))}px`;
    };
    const handleUp = () => {
      document.removeEventListener("pointermove", handleMove);
      document.removeEventListener("pointerup", handleUp);
    };
    document.addEventListener("pointermove", handleMove);
    document.addEventListener("pointerup", handleUp);
  };

  const sortIconByDirection: Record<"asc" | "desc" | "none", ReactNode> = {
    asc: <ArrowUp className="size-3.5" />,
    desc: <ArrowDown className="size-3.5" />,
    none: <ArrowUpDown className="size-3.5 text-muted-foreground" />,
  };

  return (
    <UITableHead ref={headRef} className={cn("relative", className)} {...props}>
      {sortable ? (
        <button
          type="button"
          onClick={onSort}
          className="flex items-center gap-1 hover:text-foreground"
        >
          {children}
          {sortIconByDirection[sortDirection ?? "none"]}
        </button>
      ) : (
        children
      )}
      {isResizable && (
        <div
          onPointerDown={handleResizeStart}
          className="absolute top-0 right-0 h-full w-1 cursor-col-resize touch-none select-none hover:bg-border"
        />
      )}
    </UITableHead>
  );
}

export { Table, TableHead, TableHeader, TableBody, TableFooter, TableRow, TableCell, TableCaption };
