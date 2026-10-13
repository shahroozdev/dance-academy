import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

import { PrismaClient } from "../src/generated/prisma/client";

// One-time setup of the first Content Owner (docs/content-portal-plan.md, "First-account
// provisioning"). There is deliberately no sign-up page: this runs from a terminal, by someone
// who already holds the database connection, and only while no active Content Owner exists.
// Afterwards, further users are added inside the portal by that owner.
//
// Usage: set CONTENT_OWNER_NAME, CONTENT_OWNER_EMAIL and CONTENT_OWNER_PASSWORD in the
// environment for this one run (the password is never printed or stored anywhere but as a hash;
// don't leave it in .env afterwards), then:
//
//   npm run content:create-owner -- --confirm-host=<database host>
//
// The database it writes to is DATABASE_URL. It prints that database's host and refuses to
// continue unless --confirm-host names the same host, so it cannot be pointed at the wrong
// database by accident.

const MIN_PASSWORD_LENGTH = 10;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) fail("DATABASE_URL is not set.");

  const host = new URL(connectionString).host;
  const confirmedHost = process.argv.find((argument) => argument.startsWith("--confirm-host="))?.split("=")[1];
  if (confirmedHost !== host) {
    fail(`This would write to the database at "${host}". Re-run with --confirm-host=${host} if that is the intended database.`);
  }

  const name = process.env.CONTENT_OWNER_NAME?.trim();
  const email = process.env.CONTENT_OWNER_EMAIL?.trim().toLowerCase();
  const password = process.env.CONTENT_OWNER_PASSWORD ?? "";
  if (!name || !email) fail("Set CONTENT_OWNER_NAME and CONTENT_OWNER_EMAIL.");
  if (password.length < MIN_PASSWORD_LENGTH) fail(`CONTENT_OWNER_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  try {
    const activeOwners = await db.contentUser.count({ where: { role: "OWNER", isActive: true } });
    if (activeOwners > 0) {
      fail("An active Content Owner already exists. Add further users from the Users page inside the portal.");
    }
    if (await db.contentUser.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { id: true } })) {
      fail(`A content user with the email ${email} already exists.`);
    }

    const owner = await db.contentUser.create({
      data: { name, email, role: "OWNER", passwordHash: await bcrypt.hash(password, 10) },
      select: { email: true },
    });
    console.warn(`Created the first Content Owner: ${owner.email} (database: ${host}).`);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
