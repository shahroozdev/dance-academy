export const PORTALS = ["admin", "content"] as const;

export type Portal = (typeof PORTALS)[number];

export type PortalRole = "OWNER" | "STAFF" | "EDITOR";

export type PortalLoginValues = {
  email: string;
  password: string;
};

/** One portal the visitor is signed in to, as shown in the public site's account menu. */
export type PublicPortalIdentity = {
  name: string | null | undefined;
  portal: Portal;
};

export type PortalLoginResult =
  | { status: "success" }
  | { status: "invalid-credentials" }
  | { status: "invalid-request" };
