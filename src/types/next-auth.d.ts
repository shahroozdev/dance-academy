import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "OWNER" | "STAFF";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "OWNER" | "STAFF";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "OWNER" | "STAFF";
  }
}
