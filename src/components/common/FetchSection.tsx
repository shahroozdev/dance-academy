import {
  queryRegistry,
  type QueryArgs,
  type QueryData,
  type QueryKey,
} from "@/hooks/query-registry";

import type { ReactNode } from "react";

/**
 * A bare key (no-arg actions) or a `[key, argsFrom]` tuple, where `argsFrom`
 * derives that action's args from the resolved `searchParams` — same
 * `(key, args)` shape `useQuery` takes, just built from params instead of
 * passed in directly.
 */
type RequestEntry<P, K extends QueryKey = QueryKey> =
  | K
  | readonly [K, (params: P) => QueryArgs<K>];

type ResolvedData<T extends readonly RequestEntry<never>[]> = {
  [I in keyof T]: T[I] extends readonly [infer K extends QueryKey, ...unknown[]]
    ? QueryData<K>
    : T[I] extends QueryKey
      ? QueryData<T[I]>
      : never;
};

/**
 * Resolves one or more `queryRegistry` entries by key — the server-side
 * counterpart to `useQuery`, same registry, same key names — and hands the
 * resolved data (plus the resolved `searchParams`) to `children`. Meant to
 * sit inside a `<Suspense>` boundary: requests here aren't started until
 * this component runs, so the boundary is what shows the fallback while
 * they're in flight. A rejected request propagates to the nearest error
 * boundary, same as any other server-side fetch failure.
 *
 * Pass the route's `searchParams` promise straight through — FetchSection
 * awaits it once, then hands it to each entry's `argsFrom` to build that
 * action's args. Callers don't need to `await searchParams` or make the
 * page component `async` themselves.
 *
 * Each entry is either a bare key (for actions callable with no arguments,
 * e.g. `"dashboardSummary"`) or a `[key, argsFrom]` tuple for actions that
 * need params — `argsFrom` receives the resolved `searchParams` and returns
 * that action's args (ignore the param if the args are static, e.g. a fixed
 * `limit`).
 *
 * @example
 * <Suspense fallback={<CardSkeleton />}>
 *   <FetchSection requests={["dashboardSummary"]}>
 *     {([summary]) => <p>${summary.todaySales}</p>}
 *   </FetchSection>
 * </Suspense>
 *
 * @example
 * <FetchSection
 *   searchParams={searchParams}
 *   requests={
 *     [
 *       ["goodsReceipts", (params) => [{ page: Number(params.page) || 1 }]],
 *       ["suppliers", () => [{ limit: 100 }]],
 *     ] as const
 *   }
 * >
 *   {([receipts, suppliers], params) => ...}
 * </FetchSection>
 */
export default async function FetchSection<
  const T extends readonly RequestEntry<P>[],
  P = undefined,
>({
  searchParams,
  requests,
  children,
}: {
  searchParams?: Promise<P> | P;
  requests: T;
  children: (data: ResolvedData<T>, params: P) => ReactNode;
}) {
  const params = (searchParams ? await searchParams : undefined) as P;

  const data = await Promise.all(
    requests.map((entry) => {
      if (Array.isArray(entry)) {
        const [key, argsFrom] = entry as readonly [QueryKey, (p: P) => unknown[]];
        const action = queryRegistry[key] as (...actionArgs: unknown[]) => Promise<unknown>;
        return action(...argsFrom(params));
      }
      const action = queryRegistry[entry as QueryKey] as () => Promise<unknown>;
      return action();
    }),
  );

  return <>{children(data as ResolvedData<T>, params)}</>;
}
