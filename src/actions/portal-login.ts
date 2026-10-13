"use server";

import { cookies } from "next/headers";
import { CredentialsSignin } from "next-auth";
import { z } from "zod";

import { credentialsSchema } from "@/actions/auth";
import { signIn as adminSignIn } from "@/auth";
import { contentSignIn } from "@/content-auth";
import { getPortalSessionCookieName } from "@/lib/portal-auth-cookies";
import type { Portal, PortalLoginResult, PortalLoginValues } from "@/types/portal-auth";

const portalLoginSchema = credentialsSchema.extend({ switchPortal: z.boolean() });

const portalDestinations: Record<Portal, string> = {
  admin: "/admin",
  content: "/content",
};

const oppositePortals: Record<Portal, Portal> = {
  admin: "content",
  content: "admin",
};

const portalSignIns = {
  admin: adminSignIn,
  content: contentSignIn,
};

async function signInToPortal(portal: Portal, values: PortalLoginValues): Promise<PortalLoginResult> {
  const parsed = portalLoginSchema.safeParse(values);
  if (!parsed.success) return { status: "invalid-request" };

  const oppositePortal = oppositePortals[portal];
  const cookieStore = await cookies();
  if (cookieStore.has(getPortalSessionCookieName(oppositePortal)) && !parsed.data.switchPortal) {
    return { status: "switch-required", activePortal: oppositePortal };
  }

  let result: unknown;
  try {
    result = await portalSignIns[portal]("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      switchPortal: String(parsed.data.switchPortal),
      redirect: false,
      redirectTo: portalDestinations[portal],
    });
  } catch (error) {
    // Auth.js reports rejected credentials by throwing, not through the returned address. Any
    // other failure (the database being unreachable, say) is not a wrong password and is left
    // to surface as an error, which the form reports as "Unable to sign in".
    if (error instanceof CredentialsSignin) return { status: "invalid-credentials" };
    throw error;
  }
  const destination = new URL(String(result), "http://localhost");

  if (destination.searchParams.has("error")) {
    return { status: "invalid-credentials" };
  }

  return { status: "success" };
}

export async function signInToAdmin(values: PortalLoginValues) {
  return await signInToPortal("admin", values);
}

export async function signInToContent(values: PortalLoginValues) {
  return await signInToPortal("content", values);
}
