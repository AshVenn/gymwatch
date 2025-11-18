-- Enable pgcrypto for UUID/entropy generation used for QR tokens
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create new enums for plan tiering and billing cadence
CREATE TYPE "GymPlanTier" AS ENUM ('BASIC', 'PRO');
CREATE TYPE "GymBillingInterval" AS ENUM ('MONTHLY', 'ANNUAL');

-- Prepare new plan tier column while keeping legacy data available during migration
ALTER TABLE "Gym"
ADD COLUMN     "subscriptionPlan_new" "GymPlanTier" NOT NULL DEFAULT 'BASIC'::"GymPlanTier";

-- Derive tier (we map YEARLY to PRO to keep at least one tier upgraded)
UPDATE "Gym"
SET "subscriptionPlan_new" = CASE
  WHEN "subscriptionPlan" = 'YEARLY' THEN 'PRO'::"GymPlanTier"
  ELSE 'BASIC'::"GymPlanTier"
END;

-- Add billing interval column seeded from the legacy plan column
ALTER TABLE "Gym"
ADD COLUMN     "billingInterval" "GymBillingInterval" NOT NULL DEFAULT 'MONTHLY'::"GymBillingInterval";

UPDATE "Gym"
SET "billingInterval" = CASE
  WHEN "subscriptionPlan" = 'YEARLY' THEN 'ANNUAL'::"GymBillingInterval"
  ELSE 'MONTHLY'::"GymBillingInterval"
END;

-- Replace the original column with the new enum and drop the legacy enum
ALTER TABLE "Gym" DROP COLUMN "subscriptionPlan";
ALTER TABLE "Gym" RENAME COLUMN "subscriptionPlan_new" TO "subscriptionPlan";
DROP TYPE "GymSubscriptionPlan";

-- Track the price actually billed for the plan/interval
ALTER TABLE "Gym"
ADD COLUMN     "subscriptionPrice" DOUBLE PRECISION NOT NULL DEFAULT 0;

UPDATE "Gym"
SET "subscriptionPrice" = CASE
  WHEN "subscriptionPlan" = 'BASIC' AND "billingInterval" = 'MONTHLY' THEN 200
  WHEN "subscriptionPlan" = 'BASIC' AND "billingInterval" = 'ANNUAL' THEN 2000
  WHEN "subscriptionPlan" = 'PRO' AND "billingInterval" = 'MONTHLY' THEN 350
  WHEN "subscriptionPlan" = 'PRO' AND "billingInterval" = 'ANNUAL' THEN 3300
  ELSE 0
END;

-- Add QR specific metadata for each member
ALTER TABLE "Member"
ADD COLUMN     "qrToken" TEXT NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
ADD COLUMN     "qrGeneratedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX "Member_qrToken_key" ON "Member"("qrToken");
