-- CreateTable
CREATE TABLE "Teacher" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Teacher_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add the new relation column alongside the old free-text one, so both are
-- available during the backfill below.
ALTER TABLE "Class" ADD COLUMN "teacherId" TEXT;

-- DataMigration: one Teacher row per distinct existing free-text "teacher" name, then point
-- every Class row with that name at the new Teacher row. No existing teacher name is lost.
INSERT INTO "Teacher" ("id", "name", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, distinct_teacher."teacher", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "teacher" FROM "Class" WHERE "teacher" IS NOT NULL AND "teacher" <> '') AS distinct_teacher;

UPDATE "Class" c
SET "teacherId" = te."id"
FROM "Teacher" te
WHERE te."name" = c."teacher";

-- AlterTable: the free-text column is now fully superseded by teacherId
ALTER TABLE "Class" DROP COLUMN "teacher";

-- CreateIndex
CREATE INDEX "Teacher_isActive_idx" ON "Teacher"("isActive");

-- CreateIndex
CREATE INDEX "Class_teacherId_idx" ON "Class"("teacherId");

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
