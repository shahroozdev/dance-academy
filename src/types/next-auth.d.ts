import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "OWNER" | "STAFF" | "EDITOR";
      portal: "admin" | "content";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "OWNER" | "STAFF" | "EDITOR";
    portal: "admin" | "content";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "OWNER" | "STAFF" | "EDITOR";
    portal: "admin" | "content";
  }
}
