ALTER TABLE "MonthlyStudentBilling"
ADD COLUMN "needsManualReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "manualReviewReason" TEXT,
ADD COLUMN "manualReviewAt" TIMESTAMP(3);

CREATE INDEX "MonthlyStudentBilling_needsManualReview_idx"
ON "MonthlyStudentBilling"("needsManualReview");
