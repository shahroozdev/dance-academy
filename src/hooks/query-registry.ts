// Registry of server actions readable from client components via useQuery,
// and server components via FetchSection (see AGENTS.md Code Rule 17). Add
// an entry here whenever a new domain action under src/actions/** needs to
// be called from a client component or FetchSection — both hooks infer
// argument/return types from this map.
//
// Example, once a domain action exists:
//   import { getFamilies } from "@/actions/families";
//   export const queryRegistry = { getFamilies } as const;
export const queryRegistry = {} as const;

export type QueryRegistry = typeof queryRegistry;
export type QueryKey = keyof QueryRegistry;
export type QueryArgs<K extends QueryKey> = Parameters<QueryRegistry[K]>;
export type QueryData<K extends QueryKey> = Awaited<ReturnType<QueryRegistry[K]>>;
