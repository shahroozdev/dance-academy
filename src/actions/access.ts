import "server-only";

import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Please sign in to continue.");
  const admin = await db.adminUser.findUnique({ where: { id: session.user.id } });
  if (!admin?.isActive || !["OWNER", "STAFF"].includes(admin.role)) {
    throw new Error("You do not have access to this studio.");
  }
  return { id: admin.id, role: admin.role };
}

export async function requireOwner() {
  const admin = await requireAdmin();
  if (admin.role !== "OWNER") throw new Error("Only the studio owner can manage settings.");
  return admin;
}
