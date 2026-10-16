"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, type ReactNode } from "react";

import { Input, type InputOption } from "@/components/common/input";
import { Label } from "@/components/common/label";
import { useRouter } from "@/hooks/useRouter";

// Radix select items cannot use an empty value, so "no filter" needs its own.
const ALL = "ALL";

export type UrlFilter = { param: string; label: string; allLabel: string; options: InputOption[] };

// The filter row for server-rendered list pages: every filter is a URL search parameter, so the
// server page reads it and fetches matching data. Changing a filter returns to page 1. `postComp`
// holds page actions placed after the filters (e.g. a create button).
export function FilterToggleRowServer({ filters, postComp }: { filters: UrlFilter[]; postComp?: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setFilter = useCallback((param: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === ALL) params.delete(param);
    else params.set(param, value);
    params.delete("page");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }, [pathname, router, searchParams]);

  return (
    <div className="flex flex-wrap items-end gap-3 p-2">
      {filters.map((filter) => (
        <div key={filter.param} className="w-full max-w-xs space-y-1">
          <Label htmlFor={`filter-${filter.param}`}>{filter.label}</Label>
          <Input
            id={`filter-${filter.param}`}
            type="select"
            options={[{ label: filter.allLabel, value: ALL }, ...filter.options]}
            value={searchParams.get(filter.param) ?? ALL}
            onChange={(value) => setFilter(filter.param, value)}
          />
        </div>
      ))}
      {postComp}
    </div>
  );
}
