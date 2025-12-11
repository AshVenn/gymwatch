-- Add over-limit access status for logging
ALTER TYPE "AccessEventStatus" ADD VALUE 'DENIED_DAILY_LIMIT';

-- Per-plan daily visit limit (use -1 to signal unlimited)
ALTER TABLE "MembershipPlan" ADD COLUMN "visitsPerDay" INTEGER NOT NULL DEFAULT 1;
