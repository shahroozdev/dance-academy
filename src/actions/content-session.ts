"use server";

import { contentSignOut } from "@/content-auth";

export async function signOutOfContentPortal() {
  await contentSignOut({ redirectTo: "/content/login" });
}
