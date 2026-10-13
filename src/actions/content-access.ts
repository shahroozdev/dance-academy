import "server-only";

import { redirect } from "next/navigation";

import { contentAuth } from "@/content-auth";
import { db } from "@/lib/db";
import type { ContentActor } from "@/types/content";

export async function getActiveContentUser(): Promise<ContentActor | null> {
  const session = await contentAuth();
  if (!session?.user?.id || session.user.portal !== "content") return null;

  const contentUser = await db.contentUser.findUnique({ where: { id: session.user.id } });
  if (!contentUser?.isActive || !["OWNER", "EDITOR"].includes(contentUser.role)) {
    return null;
  }
  return { id: contentUser.id, role: contentUser.role, name: contentUser.name };
}

export async function requireContentUser() {
  const contentUser = await getActiveContentUser();
  if (!contentUser) redirect("/content/login");
  return contentUser;
}

export async function requireContentOwner() {
  const contentUser = await requireContentUser();
  if (contentUser.role !== "OWNER") {
    throw new Error("Only a Content Owner can manage content users and website settings.");
  }
  return contentUser;
}
