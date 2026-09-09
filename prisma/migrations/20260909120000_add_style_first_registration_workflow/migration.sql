ALTER TABLE "RegistrationRequest"
ADD COLUMN "requestedDanceStyle" TEXT,
ADD COLUMN "enrollmentConfirmationSentAt" TIMESTAMP(3);

UPDATE "RegistrationRequest" AS registration
SET "requestedDanceStyle" = class."danceStyle"
FROM "Class" AS class
WHERE registration."requestedClassId" = class."id"
  AND registration."requestedDanceStyle" IS NULL;

UPDATE "RegistrationRequest"
SET "enrollmentConfirmationSentAt" = "processedAt"
WHERE "status" = 'PROCESSED'
  AND "requestedClassId" IS NOT NULL
  AND "processedAt" IS NOT NULL
  AND "enrollmentConfirmationSentAt" IS NULL;

UPDATE "EmailTemplate"
SET "body" = replace(
  "body",
  E'You\'ll receive a monthly fee notice once billing is generated each month.\n',
  ''
)
WHERE "key" = 'ENROLLMENT_CONFIRMED';
