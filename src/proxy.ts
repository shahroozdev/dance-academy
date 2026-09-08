import { NextResponse } from "next/server";
import NextAuth from "next-auth";

import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

export const proxy = auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === "/admin/login";

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/admin/login", req.nextUrl.origin));
  }

  // The login page checks current database access before redirecting signed-in users.
  // A JWT alone may belong to a removed or disabled admin.
});

export const config = {
  matcher: ["/admin/:path*"],
};
