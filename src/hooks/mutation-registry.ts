// Registry of server actions writable from client components via useMutate
// (see AGENTS.md Code Rule 17). Add an entry here whenever a new domain
// write under src/actions/** needs to be called from a client component.
//
// Example, once a domain action exists:
//   import { createFamily } from "@/actions/families";
//   export const mutationRegistry = { createFamily } as const;
export const mutationRegistry = {} as const;

export type MutationRegistry = typeof mutationRegistry;
export type MutationKey = keyof MutationRegistry;
export type MutationArgs<K extends MutationKey> = Parameters<MutationRegistry[K]>;
export type MutationData<K extends MutationKey> = Awaited<ReturnType<MutationRegistry[K]>>;
