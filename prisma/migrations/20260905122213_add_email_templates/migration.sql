-- CreateEnum
CREATE TYPE "EmailTemplateKey" AS ENUM ('REGISTRATION_RECEIVED', 'ENROLLMENT_CONFIRMED', 'MONTHLY_FEE_NOTICE', 'PAYMENT_REMINDER');

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "key" "EmailTemplateKey" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("key")
);
