CREATE TYPE "ExtraSessionBillingUnit" AS ENUM ('SESSION', 'HOUR');

CREATE TABLE "ClassExtraSession" (
  "id" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "sessionDate" DATE NOT NULL,
  "title" TEXT NOT NULL,
  "billingUnit" "ExtraSessionBillingUnit" NOT NULL DEFAULT 'SESSION',
  "quantity" DECIMAL(8,2) NOT NULL,
  "rate" DECIMAL(10,2) NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassExtraSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClassExtraSession_classId_sessionDate_idx" ON "ClassExtraSession"("classId", "sessionDate");

ALTER TABLE "ClassExtraSession"
  ADD CONSTRAINT "ClassExtraSession_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
