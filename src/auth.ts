import { cookies } from "next/headers";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { ZodError } from "zod";

import { credentialsSchema, verifyAdminCredentials } from "@/actions/auth";
import authConfig from "@/auth.config";
import { getPortalSessionCookieName } from "@/lib/portal-auth-cookies";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
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
          const admin = await verifyAdminCredentials(email, password);
          if (!admin) return null;

          const cookieStore = await cookies();
          const contentSessionCookie = getPortalSessionCookieName("content");
          if (cookieStore.has(contentSessionCookie)) {
            if (rawCredentials.switchPortal !== "true") return null;
            cookieStore.delete(contentSessionCookie);
          }

          return admin;
        } catch (error) {
          if (error instanceof ZodError) return null;
          throw error;
        }
      },
    }),
  ],
});
