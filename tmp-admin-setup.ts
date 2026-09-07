import bcrypt from "bcryptjs";

import { db } from "@/lib/db";

const EMAIL = "verify-import-check@local.test";
const PASSWORD = "TempVerify123!";

async function main() {
  const mode = process.argv[2];
  if (mode === "create") {
    await db.adminUser.upsert({
      where: { email: EMAIL },
      update: { passwordHash: await bcrypt.hash(PASSWORD, 10), isActive: true, role: "STAFF" },
      create: { name: "Verify Import Check (temp)", email: EMAIL, passwordHash: await bcrypt.hash(PASSWORD, 10), role: "STAFF" },
    });
    console.log("CREATED", EMAIL, PASSWORD);
  } else if (mode === "delete") {
    await db.adminUser.deleteMany({ where: { email: EMAIL } });
    console.log("DELETED", EMAIL);
  } else {
    throw new Error("usage: create|delete");
  }
}

main().then(() => process.exit(0));
