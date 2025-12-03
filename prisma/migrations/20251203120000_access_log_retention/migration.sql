-- Add retention configuration for access logs
ALTER TABLE "SystemSettings"
ADD COLUMN "accessLogRetentionDays" INTEGER NOT NULL DEFAULT 90,
ADD COLUMN "lastPurgeAt" TIMESTAMP(3);
