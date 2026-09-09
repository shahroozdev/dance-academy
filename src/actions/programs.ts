"use server";

import { requireAdmin } from "@/actions/access";
import { programCreateSchema, programUpdateSchema } from "@/actions/programs.schema";
import type { ProgramCreateInput, ProgramUpdateInput } from "@/actions/programs.schema";
import { booleanSchema, idSchema, validateListQuery } from "@/actions/validation.schema";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

export async function getPrograms(params?: {
  search?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}) {
  await requireAdmin();
  validateListQuery(params, []);
  const { search, isActive, page = 1, pageSize = 20 } = params ?? {};
  const where: Prisma.DanceProgramWhereInput = {};
  if (search) where.name = { contains: search, mode: "insensitive" };
  if (isActive !== undefined) where.isActive = isActive;

  const [data, total] = await Promise.all([
    db.danceProgram.findMany({
      where,
      include: { classes: { select: { id: true, isActive: true } } },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.danceProgram.count({ where }),
  ]);
  return {
    data: data.map(({ classes, ...program }) => ({
      ...program,
      classCount: classes.length,
      activeClassCount: classes.filter((item) => item.isActive).length,
    })),
    total,
    pages: Math.ceil(total / pageSize),
  };
}

export async function getProgramById(id: string) {
  await requireAdmin();
  id = idSchema.parse(id);
  const program = await db.danceProgram.findUniqueOrThrow({
    where: { id },
    include: {
      classes: {
        include: { teacher: { select: { name: true } }, _count: { select: { enrollments: { where: { status: "ACTIVE" } } } } },
        orderBy: [{ level: "asc" }, { name: "asc" }],
      },
    },
  });
  return {
    ...program,
    classes: program.classes.map((item) => ({ ...item, standardRate: Number(item.standardRate) })),
  };
}

export async function getActivePrograms() {
  await requireAdmin();
  return db.danceProgram.findMany({ where: { isActive: true }, orderBy: { name: "asc" } });
}

export async function getRegistrationPrograms() {
  return db.danceProgram.findMany({
    where: { isActive: true, classes: { some: { isActive: true } } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

async function assertUniqueName(name: string, excludedId?: string) {
  const existing = await db.danceProgram.findFirst({
    where: { name: { equals: name, mode: "insensitive" }, ...(excludedId && { id: { not: excludedId } }) },
    select: { id: true },
  });
  if (existing) throw new Error("A dance program with this name already exists.");
}

export async function createProgram(data: ProgramCreateInput) {
  await requireAdmin();
  data = programCreateSchema.parse(data);
  await assertUniqueName(data.name);
  return db.danceProgram.create({
    data: { name: data.name, description: data.description || null, isActive: data.isActive },
  });
}

export async function updateProgram(id: string, data: ProgramUpdateInput) {
  await requireAdmin();
  id = idSchema.parse(id);
  data = programUpdateSchema.parse(data);
  if (data.name !== undefined) await assertUniqueName(data.name, id);
  return db.danceProgram.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
    },
  });
}

export async function toggleProgramActive(id: string, isActive: boolean) {
  await requireAdmin();
  id = idSchema.parse(id);
  isActive = booleanSchema.parse(isActive);
  if (!isActive) {
    const activeClasses = await db.class.count({ where: { programId: id, isActive: true } });
    if (activeClasses > 0) throw new Error("Deactivate this program's active classes first.");
  }
  return db.danceProgram.update({ where: { id }, data: { isActive } });
}
