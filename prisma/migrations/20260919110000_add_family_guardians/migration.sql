CREATE TABLE "FamilyGuardian" (
  "id" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "relationship" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "receivesNotifications" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FamilyGuardian_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FamilyGuardian_familyId_idx" ON "FamilyGuardian"("familyId");

ALTER TABLE "FamilyGuardian"
  ADD CONSTRAINT "FamilyGuardian_familyId_fkey"
  FOREIGN KEY ("familyId") REFERENCES "Family"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "FamilyGuardian" (
  "id", "familyId", "name", "email", "phone", "isPrimary", "receivesNotifications", "updatedAt"
)
SELECT
  'guardian_' || "id", "id", "parentGuardianName", "email", "phone", true, true, CURRENT_TIMESTAMP
FROM "Family";
