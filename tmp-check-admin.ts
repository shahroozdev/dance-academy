import { db } from "@/lib/db";

async function main() {
  const admins = await db.adminUser.findMany({ select: { email: true, role: true, isActive: true } });
  console.log(JSON.stringify(admins, null, 2));
}

main().then(() => process.exit(0));
