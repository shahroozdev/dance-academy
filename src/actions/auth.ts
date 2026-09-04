import bcrypt from "bcryptjs";
import { z } from "zod";

import { db } from "@/lib/db";

export const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export type AdminSessionUser = {
  id: string;
  name: string;
  email: string;
  role: "OWNER" | "STAFF";
};

/** Looks up an active admin by email and verifies the password hash. Used only by src/auth.ts's Credentials authorize callback. */
export async function verifyAdminCredentials(
  email: string,
  password: string,
): Promise<AdminSessionUser | null> {
  const admin = await db.adminUser.findUnique({ where: { email } });
  if (!admin || !admin.isActive) return null;

  const passwordMatches = await bcrypt.compare(password, admin.passwordHash);
  if (!passwordMatches) return null;

  return { id: admin.id, name: admin.name, email: admin.email, role: admin.role };
}
