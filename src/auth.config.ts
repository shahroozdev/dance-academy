import { getPortalAuthCookies } from "@/lib/portal-auth-cookies";

import type { NextAuthConfig } from "next-auth";

export default {
  session: { strategy: "jwt" },
  pages: { signIn: "/admin/login" },
  cookies: getPortalAuthCookies("admin"),
  providers: [],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.portal = user.portal;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as "OWNER" | "STAFF" | "EDITOR";
      session.user.portal = token.portal as "admin" | "content";
      return session;
    },
  },
} satisfies NextAuthConfig;
