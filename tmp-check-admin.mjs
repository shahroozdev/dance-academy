import { PrismaClient } from "./src/generated/prisma/client/index.js";

const db = new PrismaClient();
try {
  const admins = await db.adminUser.findMany({ select: { email: true, role: true, isActive: true } });
  console.log(JSON.stringify(admins, null, 2));
} finally {
  await db.$disconnect();
}
