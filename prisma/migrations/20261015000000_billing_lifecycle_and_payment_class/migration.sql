ALTER TABLE "Class" ADD COLUMN "lastClassDate" DATE;

ALTER TABLE "Payment" ADD COLUMN "classId" TEXT;

CREATE INDEX "Payment_classId_idx" ON "Payment"("classId");

ALTER TABLE "Payment"
ADD CONSTRAINT "Payment_classId_fkey"
FOREIGN KEY ("classId") REFERENCES "Class"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
