-- AlterTable
ALTER TABLE "ClassMonthlyFee" ADD COLUMN     "finalizedAt" TIMESTAMP(3),
ADD COLUMN     "isFinalized" BOOLEAN NOT NULL DEFAULT false;
