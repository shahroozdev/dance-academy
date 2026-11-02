"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { subscribe } from "@/hooks/query-cache-events";
import { queryRegistry, type QueryArgs, type QueryData, type QueryKey } from "@/hooks/query-registry";

type UseQueryOptions<K extends QueryKey> = {
  enabled?: boolean;
  initialData?: QueryData<K>;
};

/**
 * Reads a server action registered in query-registry.ts. Refetches whenever
 * `key`/`args` change, when a useMutate call invalidates this `key`, or when
 * `refetch` is called manually. `initialData` (server-seeded) skips the
 * duplicate mount fetch while staying visible during later refetches.
 */
export function useQuery<K extends QueryKey>(
  key: K,
  args: QueryArgs<K>,
  options: UseQueryOptions<K> = {},
) {
  const { enabled = true, initialData } = options;
  const [data, setData] = useState<QueryData<K> | undefined>(initialData);
  const [error, setError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState(enabled && initialData === undefined);
  const latestRequestId = useRef(0);
  const argsKey = JSON.stringify(args);

  const run = useCallback(() => {
    if (!enabled) return;
    const requestId = ++latestRequestId.current;
    setIsLoading(true);
    setError(null);

    // Registry union type is too complex for TS to verify — safe at runtime because
    // the registry key maps to the exact action that expects these args.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const action = queryRegistry[key] as any as (...actionArgs: QueryArgs<K>) => Promise<QueryData<K>>;
    action(...args)
      .then((result) => {
        if (latestRequestId.current !== requestId) return;
        setData(result);
        setIsLoading(false);
      })
      .catch((caughtError: unknown) => {
        if (latestRequestId.current !== requestId) return;
        setError(caughtError);
        setIsLoading(false);
      });
    // argsKey is a stable stand-in for args (a new array/object literal every render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, argsKey, enabled]);

  // Server-seeded data is current for the args it was fetched with, so no fetch is made while the
  // args are unchanged (as documented above) — also when React runs this effect twice on mount in
  // development. Once the args change it refetches as usual, and invalidations always refetch.
  // Without this every seeded page loaded its data twice.
  const seededArgsKey = useRef(initialData !== undefined ? argsKey : null);
  useEffect(() => {
    if (seededArgsKey.current === argsKey) return;
    seededArgsKey.current = null;
    // Fetch-on-mount/deps-change: `run` synchronously resets loading/error
    // state before making the (always async) request — the standard shape
    // for this kind of hook, not props-to-state duplication.
    run();
  }, [run, argsKey]);

  useEffect(() => subscribe(key, run), [key, run]);

  return { data, error, isLoading, refetch: run };
}
