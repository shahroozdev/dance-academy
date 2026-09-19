ALTER TABLE "Class" ADD COLUMN "firstClassDate" DATE;

UPDATE "Class" AS c
SET "firstClassDate" = COALESCE(
  (SELECT MIN(e."startDate") FROM "Enrollment" AS e WHERE e."classId" = c.id),
  c."createdAt"::date
);

DELETE FROM "ClassMonthlyFee" AS fee
USING "Class" AS c
WHERE fee."classId" = c.id
  AND fee.month < date_trunc('month', c."firstClassDate")
  AND NOT EXISTS (
    SELECT 1 FROM "MonthlyBillingLineItem" AS item
    WHERE item."classMonthlyFeeId" = fee.id
  );

ALTER TABLE "Class" ALTER COLUMN "firstClassDate" SET NOT NULL;
