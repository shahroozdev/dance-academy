"use server";

import { auth, signOut as adminSignOut } from "@/auth";
import { contentAuth, contentSignOut } from "@/content-auth";
import type { Portal } from "@/types/portal-auth";

export type PublicPortalIdentity = {
  name: string | null | undefined;
  portal: Portal;
};

const portalSignOuts = {
  admin: adminSignOut,
  content: contentSignOut,
};

export async function getPublicPortalIdentity(): Promise<PublicPortalIdentity | null> {
  const [adminSession, contentSession] = await Promise.all([auth(), contentAuth()]);
  const identities = [adminSession, contentSession]
    .map((session) => {
      const portal = session?.user?.portal;
      return portal ? { name: session.user.name, portal } : null;
    })
    .filter((identity): identity is PublicPortalIdentity => identity !== null);

  return identities.length === 1 ? identities[0] : null;
}

export async function signOutOfPublicPortal(portal: Portal) {
  await portalSignOuts[portal]({ redirectTo: "/" });
}
