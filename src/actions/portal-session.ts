"use server";

import { auth, signOut as adminSignOut } from "@/auth";
import { contentAuth, contentSignOut } from "@/content-auth";
import type { Portal, PublicPortalIdentity } from "@/types/portal-auth";

const portalSignOuts = {
  admin: adminSignOut,
  content: contentSignOut,
};

/** Every portal this browser is signed in to (none, one, or both), admin first. */
export async function getPublicPortalIdentities(): Promise<PublicPortalIdentity[]> {
  const [adminSession, contentSession] = await Promise.all([auth(), contentAuth()]);
  return [adminSession, contentSession]
    .map((session) => {
      const portal = session?.user?.portal;
      return portal ? { name: session.user.name, portal } : null;
    })
    .filter((identity): identity is PublicPortalIdentity => identity !== null);
}

export async function signOutOfPublicPortal(portal: Portal) {
  await portalSignOuts[portal]({ redirectTo: "/" });
}
