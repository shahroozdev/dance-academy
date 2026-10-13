import type { Portal } from "@/types/portal-auth";

const cookiePrefixes: Record<Portal, string> = {
  admin: "malhaar-admin",
  content: "malhaar-content",
};

const isSecure = process.env.NODE_ENV === "production";
const securePrefix = isSecure ? "__Secure-" : "";

function cookieName(portal: Portal, suffix: string) {
  return `${securePrefix}${cookiePrefixes[portal]}.${suffix}`;
}

function cookieOptions(httpOnly: boolean) {
  return {
    httpOnly,
    sameSite: "lax" as const,
    path: "/",
    secure: isSecure,
  };
}

export function getPortalAuthCookies(portal: Portal) {
  return {
    sessionToken: {
      name: cookieName(portal, "session-token"),
      options: cookieOptions(true),
    },
    callbackUrl: {
      name: cookieName(portal, "callback-url"),
      options: cookieOptions(true),
    },
    csrfToken: {
      name: cookieName(portal, "csrf-token"),
      options: cookieOptions(false),
    },
    pkceCodeVerifier: {
      name: cookieName(portal, "pkce.code_verifier"),
      options: {
        ...cookieOptions(true),
        maxAge: 60 * 15,
      },
    },
    state: {
      name: cookieName(portal, "state"),
      options: {
        ...cookieOptions(true),
        maxAge: 60 * 15,
      },
    },
    nonce: {
      name: cookieName(portal, "nonce"),
      options: cookieOptions(true),
    },
    webauthnChallenge: {
      name: cookieName(portal, "webauthn.challenge"),
      options: {
        ...cookieOptions(true),
        maxAge: 60 * 15,
      },
    },
  };
}

export function getPortalSessionCookieName(portal: Portal) {
  return getPortalAuthCookies(portal).sessionToken.name;
}
