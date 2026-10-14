export const PORTALS = ["admin", "content"] as const;

export type Portal = (typeof PORTALS)[number];

export type PortalRole = "OWNER" | "STAFF" | "EDITOR";

export type PortalLoginValues = {
  email: string;
  password: string;
};

export type PortalLoginResult =
  | { status: "success" }
  | { status: "invalid-credentials" }
  | { status: "invalid-request" };
