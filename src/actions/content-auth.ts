import "server-only";

import bcrypt from "bcryptjs";

import { db } from "@/lib/db";

export type ContentSessionUser = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "EDITOR";
  portal: "content";
};

/** Looks up an active Content User by email and verifies its password hash. Used only by Content Auth's Credentials provider. */
export async function verifyContentCredentials(
  email: string,
  password: string,
): Promise<ContentSessionUser | null> {
  const contentUser = await db.contentUser.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (!contentUser || !contentUser.isActive) return null;

  const passwordMatches = await bcrypt.compare(password, contentUser.passwordHash);
  if (!passwordMatches) return null;

  return {
    id: contentUser.id,
    name: contentUser.name,
    email: contentUser.email,
    role: contentUser.role,
    portal: "content",
  };
}
