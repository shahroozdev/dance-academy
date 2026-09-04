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

    const action = queryRegistry[key] as (...actionArgs: QueryArgs<K>) => Promise<QueryData<K>>;
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

  useEffect(() => {
    // Fetch-on-mount/deps-change: `run` synchronously resets loading/error
    // state before making the (always async) request — the standard shape
    // for this kind of hook, not props-to-state duplication.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run();
  }, [run]);

  useEffect(() => subscribe(key, run), [key, run]);

  return { data, error, isLoading, refetch: run };
}
