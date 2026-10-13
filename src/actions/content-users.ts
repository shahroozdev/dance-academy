"use server";

import bcrypt from "bcryptjs";

import { requireContentOwner } from "@/actions/content-access";
import { recordContentAudit } from "@/actions/content-service";
import {
  contentPasswordSchema,
  contentUserCreateSchema,
  contentUserUpdateSchema,
  type ContentPasswordInput,
  type ContentUserCreateInput,
  type ContentUserUpdateInput,
} from "@/actions/content.schema";
import { idSchema } from "@/actions/validation.schema";
import { db } from "@/lib/db";

const ROLE_LABELS = { OWNER: "Content Owner", EDITOR: "Content Editor" };

// Never includes the password hash.
const userColumns = { id: true, name: true, email: true, role: true, isActive: true, createdAt: true } as const;

export async function getContentUsers() {
  await requireContentOwner();
  return db.contentUser.findMany({ orderBy: [{ isActive: "desc" }, { name: "asc" }], select: userColumns });
}

export async function createContentUser(data: ContentUserCreateInput) {
  const owner = await requireContentOwner();
  data = contentUserCreateSchema.parse(data);

  const existing = await db.contentUser.findFirst({
    where: { email: { equals: data.email, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) throw new Error("A content user with this email address already exists.");

  const user = await db.contentUser.create({
    data: { name: data.name, email: data.email, role: data.role, passwordHash: await bcrypt.hash(data.password, 10) },
    select: userColumns,
  });
  await recordContentAudit(owner, {
    action: "created",
    entityType: "user",
    entityId: user.id,
    summary: `Added ${user.name} as a ${ROLE_LABELS[user.role]}.`,
  });
  return user;
}

export async function updateContentUser(id: string, data: ContentUserUpdateInput) {
  const owner = await requireContentOwner();
  id = idSchema.parse(id);
  data = contentUserUpdateSchema.parse(data);

  const existing = await db.contentUser.findUniqueOrThrow({ where: { id }, select: { role: true, isActive: true } });
  const wasActiveOwner = existing.role === "OWNER" && existing.isActive;
  const staysActiveOwner = data.role === "OWNER" && data.isActive;
  if (wasActiveOwner && !staysActiveOwner) {
    const otherOwners = await db.contentUser.count({ where: { role: "OWNER", isActive: true, id: { not: id } } });
    if (otherOwners === 0) throw new Error("The portal needs at least one active Content Owner.");
  }

  const user = await db.contentUser.update({
    where: { id },
    data: { name: data.name, role: data.role, isActive: data.isActive },
    select: userColumns,
  });
  await recordContentAudit(owner, {
    action: "updated",
    entityType: "user",
    entityId: id,
    summary: `Updated ${user.name}: ${ROLE_LABELS[user.role]}, ${user.isActive ? "active" : "deactivated"}.`,
  });
  return user;
}

export async function setContentUserPassword(id: string, data: ContentPasswordInput) {
  const owner = await requireContentOwner();
  id = idSchema.parse(id);
  data = contentPasswordSchema.parse(data);

  const user = await db.contentUser.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(data.password, 10) },
    select: { id: true, name: true },
  });
  await recordContentAudit(owner, {
    action: "updated",
    entityType: "user",
    entityId: id,
    summary: `Set a new password for ${user.name}.`,
  });
  return { id };
}
