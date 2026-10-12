ALTER TABLE "Class"
ADD COLUMN "inactiveFromMonth" DATE;

UPDATE "Class"
SET "inactiveFromMonth" = date_trunc('month', CURRENT_DATE)::date
WHERE "isActive" = false;

ALTER TABLE "ClassMonthlyFee"
ADD COLUMN "reportedSessions" INTEGER,
ADD COLUMN "reportNotes" TEXT,
ADD COLUMN "reportedAt" TIMESTAMP(3);
