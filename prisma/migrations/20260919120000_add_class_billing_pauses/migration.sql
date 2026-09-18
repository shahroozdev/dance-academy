CREATE TABLE "ClassBillingPause" (
  "id" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "startMonth" DATE NOT NULL,
  "endMonth" DATE NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassBillingPause_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClassBillingPause_classId_idx" ON "ClassBillingPause"("classId");
CREATE INDEX "ClassBillingPause_startMonth_endMonth_idx" ON "ClassBillingPause"("startMonth", "endMonth");

ALTER TABLE "ClassBillingPause"
  ADD CONSTRAINT "ClassBillingPause_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
