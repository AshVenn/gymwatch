-- AlterTable
ALTER TABLE "Gym"
ADD COLUMN     "subscriptionStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "subscriptionExpiresAt" TIMESTAMP(3),
ADD COLUMN     "subscriptionGracePeriodDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "analyticsSnapshot" JSONB;
