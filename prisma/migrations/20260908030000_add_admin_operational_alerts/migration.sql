ALTER TABLE "StudioSettings"
ADD COLUMN "registrationAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "paymentRecordedAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "creditAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "billingFailureAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "parentNotificationFailureAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "paymentReminderFailureAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "unfinalizedFeeAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "lastUnfinalizedFeeAlertMonth" TIMESTAMP(3);
