"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { TablePagination } from "@/components/shared/table-pagination";
import { useRouter } from "@/hooks/useRouter";
import { parsePageParams } from "@/lib/pagination";

// The card-footer pagination for server-rendered list pages: page and page size live in the URL,
// so the server page fetches exactly the requested page. Changing the page size returns to page 1.
export function PaginationServer({ pages, total, itemLabel }: { pages: number; total: number; itemLabel: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { page, pageSize } = parsePageParams({ page: searchParams.get("page"), pageSize: searchParams.get("pageSize") });

  const navigate = useCallback((next: { page: number; pageSize: number }) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(next.page));
    params.set("pageSize", String(next.pageSize));
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, router, searchParams]);

  return (
    <TablePagination
      page={page}
      pageSize={pageSize}
      total={total}
      pages={pages}
      itemLabel={itemLabel}
      onPageChange={(nextPage) => navigate({ page: nextPage, pageSize })}
      onPageSizeChange={(nextSize) => navigate({ page: 1, pageSize: nextSize })}
    />
  );
}
