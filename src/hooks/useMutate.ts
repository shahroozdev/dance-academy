"use client";

import { useState } from "react";

import {
  mutationRegistry,
  type MutationArgs,
  type MutationData,
  type MutationKey,
} from "@/hooks/mutation-registry";
import { invalidate } from "@/hooks/query-cache-events";
import type { QueryKey } from "@/hooks/query-registry";

type UseMutateOptions<K extends MutationKey> = {
  invalidateKeys?: QueryKey[];
  onSuccess?: (result: MutationData<K>) => void;
  onError?: (error: unknown) => void;
};

/**
 * Writes through a server action registered in mutation-registry.ts, then
 * refetches every `invalidateKeys` entry currently mounted via useQuery.
 */
export function useMutate<K extends MutationKey>(key: K, options: UseMutateOptions<K> = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const mutate = async (...args: MutationArgs<K>) => {
    setIsLoading(true);
    setError(null);
    try {
      const action = mutationRegistry[key] as (
        ...actionArgs: MutationArgs<K>
      ) => Promise<MutationData<K>>;
      const result = await action(...args);
      if (options.invalidateKeys?.length) invalidate(options.invalidateKeys);
      options.onSuccess?.(result);
      return result;
    } catch (caughtError) {
      setError(caughtError);
      options.onError?.(caughtError);
      throw caughtError;
    } finally {
      setIsLoading(false);
    }
  };

  return { mutate, isLoading, error };
}
