-- AlterTable
ALTER TABLE "MonthlyStudentBilling" ADD COLUMN     "reminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "StudioSettings" ADD COLUMN     "dueDayOfMonth" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "paymentReminderDaysAfterDue" INTEGER NOT NULL DEFAULT 7;
