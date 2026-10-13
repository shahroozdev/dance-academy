import { NextResponse } from "next/server";
import NextAuth from "next-auth";

import authConfig from "@/auth.config";
import contentAuthConfig from "@/content-auth.config";

const { auth: adminAuth } = NextAuth(authConfig);
const { auth: contentAuth } = NextAuth(contentAuthConfig);

const adminProxy = adminAuth((req) => {
  const isLoginPage = req.nextUrl.pathname === "/admin/login";

  if (req.auth?.user?.portal !== "admin" && !isLoginPage) {
    return NextResponse.redirect(new URL("/admin/login", req.nextUrl.origin));
  }

  // The login page checks current database access before redirecting signed-in users.
  // A JWT alone may belong to a removed or disabled admin.
});

const contentProxy = contentAuth((req) => {
  const isLoginPage = req.nextUrl.pathname === "/content/login";

  if (req.auth?.user?.portal !== "content" && !isLoginPage) {
    return NextResponse.redirect(new URL("/content/login", req.nextUrl.origin));
  }
});

export function proxy(...args: Parameters<typeof adminProxy>) {
  const [req] = args;
  return req.nextUrl.pathname.startsWith("/content") ? contentProxy(...args) : adminProxy(...args);
}

export const config = {
  matcher: ["/admin/:path*", "/content/:path*"],
};
