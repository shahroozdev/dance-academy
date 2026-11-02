-- Positions the studio is hiring for, shown on the public Careers page once published.
CREATE TABLE "JobOpening" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "employmentType" TEXT,
    "description" TEXT NOT NULL,
    "applyUrl" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "publishedById" TEXT,
    "publishedByName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobOpening_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobOpening_status_idx" ON "JobOpening"("status");

-- Job applications are saved as inquiries; these optional columns hold what only they have.
-- Existing inquiries are unaffected (every new column is empty for them).
ALTER TABLE "Inquiry" ADD COLUMN     "availability" TEXT,
ADD COLUMN     "experience" TEXT,
ADD COLUMN     "jobOpeningId" TEXT,
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "resumeName" TEXT,
ADD COLUMN     "resumePublicId" TEXT;

-- CreateIndex
CREATE INDEX "Inquiry_interestedIn_createdAt_idx" ON "Inquiry"("interestedIn", "createdAt");

-- AddForeignKey
ALTER TABLE "Inquiry" ADD CONSTRAINT "Inquiry_jobOpeningId_fkey" FOREIGN KEY ("jobOpeningId") REFERENCES "JobOpening"("id") ON DELETE SET NULL ON UPDATE CASCADE;
