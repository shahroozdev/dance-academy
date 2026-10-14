"use server";

import { CredentialsSignin } from "next-auth";

import { credentialsSchema } from "@/actions/auth";
import { signIn as adminSignIn } from "@/auth";
import { contentSignIn } from "@/content-auth";
import type { Portal, PortalLoginResult, PortalLoginValues } from "@/types/portal-auth";

const portalDestinations: Record<Portal, string> = {
  admin: "/admin",
  content: "/content",
};

const portalSignIns = {
  admin: adminSignIn,
  content: contentSignIn,
};

async function signInToPortal(portal: Portal, values: PortalLoginValues): Promise<PortalLoginResult> {
  const parsed = credentialsSchema.safeParse(values);
  if (!parsed.success) return { status: "invalid-request" };

  let result: unknown;
  try {
    result = await portalSignIns[portal]("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
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
