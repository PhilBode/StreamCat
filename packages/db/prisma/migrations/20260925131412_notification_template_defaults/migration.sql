-- AlterTable
ALTER TABLE "NotificationConfig" ALTER COLUMN "mainStreamNotification" SET DEFAULT 'Hey @everyone! {Username} is now live!',
ALTER COLUMN "partnerStreamNotification" SET DEFAULT 'Hey @here! {Username} is now live!';

-- Backfill
UPDATE "NotificationConfig" SET "mainStreamNotification" = 'Hey @everyone! {Username} is now live!' WHERE "mainStreamNotification" IS NULL;
UPDATE "NotificationConfig" SET "partnerStreamNotification" = 'Hey @here! {Username} is now live!' WHERE "partnerStreamNotification" IS NULL;

-- AlterTable
ALTER TABLE "NotificationConfig" ALTER COLUMN "mainStreamNotification" SET NOT NULL,
ALTER COLUMN "partnerStreamNotification" SET NOT NULL;
