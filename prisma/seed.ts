import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

async function main() {
  const email = process.env.SEED_OWNER_EMAIL ?? "owner@malhaardance.example";
  const password = process.env.SEED_OWNER_PASSWORD ?? "changeme123";

  const owner = await db.adminUser.upsert({
    where: { email },
    update: {},
    create: {
      name: "Studio Owner",
      email,
      passwordHash: await bcrypt.hash(password, 10),
      role: "OWNER",
    },
  });

  console.log(`Seeded owner admin user: ${owner.email}`);
  if (!process.env.SEED_OWNER_PASSWORD) {
    console.log(`(default password: "${password}" — change it via SEED_OWNER_PASSWORD before real use)`);
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
