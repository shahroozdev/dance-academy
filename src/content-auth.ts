import { cookies } from "next/headers";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { ZodError } from "zod";

import { credentialsSchema } from "@/actions/auth";
import { verifyContentCredentials } from "@/actions/content-auth";
import contentAuthConfig from "@/content-auth.config";
import { getPortalSessionCookieName } from "@/lib/portal-auth-cookies";

export const {
  handlers: contentAuthHandlers,
  signIn: contentSignIn,
  signOut: contentSignOut,
  auth: contentAuth,
} = NextAuth({
  ...contentAuthConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        switchPortal: { label: "Switch portal", type: "hidden" },
      },
      authorize: async (rawCredentials) => {
        try {
          const { email, password } = credentialsSchema.parse(rawCredentials);
          const contentUser = await verifyContentCredentials(email, password);
          if (!contentUser) return null;

          const cookieStore = await cookies();
          const adminSessionCookie = getPortalSessionCookieName("admin");
          if (cookieStore.has(adminSessionCookie)) {
            if (rawCredentials.switchPortal !== "true") return null;
            cookieStore.delete(adminSessionCookie);
          }

          return contentUser;
        } catch (error) {
          if (error instanceof ZodError) return null;
          throw error;
        }
      },
    }),
  ],
});
