ALTER TABLE "StudioSettings"
ADD COLUMN "billingAlertEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "billingAlertEmail" TEXT,
ADD COLUMN "parentNotificationAlertEnabled" BOOLEAN NOT NULL DEFAULT true;
