CREATE TYPE "ContentRole" AS ENUM ('OWNER', 'EDITOR');

CREATE TABLE "ContentUser" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "ContentRole" NOT NULL DEFAULT 'EDITOR',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ContentUser_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ContentUser_email_key" ON "ContentUser"("email");
CREATE INDEX "ContentUser_isActive_idx" ON "ContentUser"("isActive");
