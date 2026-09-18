CREATE TABLE "EnrollmentBillingPause" (
  "id" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "startMonth" DATE NOT NULL,
  "endMonth" DATE NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EnrollmentBillingPause_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EnrollmentBillingPause_enrollmentId_idx" ON "EnrollmentBillingPause"("enrollmentId");
CREATE INDEX "EnrollmentBillingPause_startMonth_endMonth_idx" ON "EnrollmentBillingPause"("startMonth", "endMonth");

ALTER TABLE "EnrollmentBillingPause"
  ADD CONSTRAINT "EnrollmentBillingPause_enrollmentId_fkey"
  FOREIGN KEY ("enrollmentId") REFERENCES "Enrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
