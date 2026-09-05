-- AlterTable
ALTER TABLE "StudioSettings" ADD COLUMN     "emailFrom" TEXT,
ADD COLUMN     "multiClassDiscountPct" DECIMAL(5,4) NOT NULL DEFAULT 0.05,
ADD COLUMN     "siblingDiscountPct" DECIMAL(5,4) NOT NULL DEFAULT 0.05,
ADD COLUMN     "smtpHost" TEXT,
ADD COLUMN     "smtpPassword" TEXT,
ADD COLUMN     "smtpPort" INTEGER DEFAULT 587,
ADD COLUMN     "smtpSecure" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "smtpUser" TEXT,
ADD COLUMN     "whatsappAccessToken" TEXT,
ADD COLUMN     "whatsappBusinessAccountId" TEXT,
ADD COLUMN     "whatsappPhoneNumberId" TEXT;
