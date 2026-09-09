CREATE TABLE "DanceProgram" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DanceProgram_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DanceProgram_name_key" ON "DanceProgram"("name");
CREATE INDEX "DanceProgram_isActive_idx" ON "DanceProgram"("isActive");

INSERT INTO "DanceProgram" ("id", "name", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, source."name", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM (
  SELECT DISTINCT ON (lower("name")) "name"
  FROM (
    SELECT trim("danceStyle") AS "name" FROM "Class" WHERE trim("danceStyle") <> ''
    UNION
    SELECT trim("requestedDanceStyle") AS "name"
    FROM "RegistrationRequest"
    WHERE "requestedDanceStyle" IS NOT NULL AND trim("requestedDanceStyle") <> ''
  ) AS names
  ORDER BY lower("name"), "name"
) AS source;

ALTER TABLE "Class" ADD COLUMN "programId" TEXT;

UPDATE "Class" AS class
SET "programId" = program."id"
FROM "DanceProgram" AS program
WHERE lower(trim(class."danceStyle")) = lower(program."name");

ALTER TABLE "Class" ALTER COLUMN "programId" SET NOT NULL;
CREATE INDEX "Class_programId_idx" ON "Class"("programId");
ALTER TABLE "Class" ADD CONSTRAINT "Class_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES "DanceProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RegistrationRequest" ADD COLUMN "requestedProgramId" TEXT;

UPDATE "RegistrationRequest" AS registration
SET "requestedProgramId" = program."id"
FROM "DanceProgram" AS program
WHERE lower(trim(registration."requestedDanceStyle")) = lower(program."name");

UPDATE "RegistrationRequest" AS registration
SET "requestedProgramId" = class."programId"
FROM "Class" AS class
WHERE registration."requestedProgramId" IS NULL
  AND registration."requestedClassId" = class."id";

CREATE INDEX "RegistrationRequest_requestedProgramId_idx" ON "RegistrationRequest"("requestedProgramId");
ALTER TABLE "RegistrationRequest" ADD CONSTRAINT "RegistrationRequest_requestedProgramId_fkey"
  FOREIGN KEY ("requestedProgramId") REFERENCES "DanceProgram"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Class" DROP COLUMN "danceStyle";
ALTER TABLE "RegistrationRequest" DROP COLUMN "requestedDanceStyle";
