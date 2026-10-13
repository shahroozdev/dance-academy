export const PORTALS = ["admin", "content"] as const;

export type Portal = (typeof PORTALS)[number];

export type PortalRole = "OWNER" | "STAFF" | "EDITOR";

export type PortalLoginValues = {
  email: string;
  password: string;
  switchPortal: boolean;
};

export type PortalLoginResult =
  | { status: "success" }
  | { status: "invalid-credentials" }
  | { status: "switch-required"; activePortal: Portal }
  | { status: "invalid-request" };
