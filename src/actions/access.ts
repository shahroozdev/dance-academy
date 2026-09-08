import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { db } from "@/lib/db";

export async function getActiveAdmin() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const admin = await db.adminUser.findUnique({ where: { id: session.user.id } });
  if (!admin?.isActive || !["OWNER", "STAFF"].includes(admin.role)) {
    return null;
  }
  return { id: admin.id, role: admin.role };
}

export async function requireAdmin() {
  const admin = await getActiveAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function requireOwner() {
  const admin = await requireAdmin();
  if (admin.role !== "OWNER") throw new Error("Only the studio owner can manage settings.");
  return admin;
}
