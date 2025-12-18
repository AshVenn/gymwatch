-- Drop legacy access attempt logs
DROP TABLE "AccessAttemptLog";

-- Remove max daily check-in limits from gyms and plans
ALTER TABLE "Gym" DROP COLUMN "maxDailyCheckIns";
ALTER TABLE "Plan" DROP COLUMN "maxDailyCheckIns";
