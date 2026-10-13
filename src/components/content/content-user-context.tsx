"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

import type { ContentRole } from "@/types/content";

type ContentUserContextValue = { role: ContentRole; isOwner: boolean };

const ContentUserContext = createContext<ContentUserContextValue | null>(null);

/**
 * Tells the portal's screens who is signed in, so they can hide controls the person cannot use.
 * Hiding is a convenience only — every action checks the session and role again on the server.
 */
export function ContentUserProvider({ role, children }: { role: ContentRole; children: ReactNode }) {
  const value = useMemo(() => ({ role, isOwner: role === "OWNER" }), [role]);
  return <ContentUserContext.Provider value={value}>{children}</ContentUserContext.Provider>;
}

export function useContentUser() {
  const value = useContext(ContentUserContext);
  if (!value) throw new Error("useContentUser must be used inside the Content Portal layout.");
  return value;
}
