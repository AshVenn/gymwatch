/*
  Warnings:

  - The values [COMPLEX] on the enum `GymPlanTier` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `complexMonthlyPrice` on the `PlanSettings` table. All the data in the column will be lost.

*/
-- AlterEnum
ALTER TYPE "AccessEventStatus" ADD VALUE 'SESSION_OVERSTAY';

-- AlterEnum
BEGIN;
CREATE TYPE "GymPlanTier_new" AS ENUM ('BASIC', 'PRO', 'ENTERPRISE');
ALTER TABLE "public"."Gym" ALTER COLUMN "subscriptionPlan" DROP DEFAULT;
ALTER TABLE "Gym" ALTER COLUMN "subscriptionPlan" TYPE "GymPlanTier_new" USING ("subscriptionPlan"::text::"GymPlanTier_new");
ALTER TABLE "DemoRequest" ALTER COLUMN "plan" TYPE "GymPlanTier_new" USING ("plan"::text::"GymPlanTier_new");
ALTER TYPE "GymPlanTier" RENAME TO "GymPlanTier_old";
ALTER TYPE "GymPlanTier_new" RENAME TO "GymPlanTier";
DROP TYPE "public"."GymPlanTier_old";
ALTER TABLE "Gym" ALTER COLUMN "subscriptionPlan" SET DEFAULT 'BASIC';
COMMIT;

-- AlterTable
ALTER TABLE "Gym" ADD COLUMN     "planLimitPerNetwork" INTEGER,
ADD COLUMN     "planLimitPerVariant" INTEGER;

-- AlterTable
ALTER TABLE "GymVariant" ADD COLUMN     "maxSessionMinutes" INTEGER;

-- AlterTable
ALTER TABLE "Member" ALTER COLUMN "qrToken" SET DEFAULT encode(gen_random_bytes(16), 'hex');

-- AlterTable
ALTER TABLE "MembershipPlan" ADD COLUMN     "maxSessionMinutes" INTEGER;

-- AlterTable
ALTER TABLE "PlanSettings" DROP COLUMN "complexMonthlyPrice",
ADD COLUMN     "basicPlanLimitPerNetwork" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "basicPlanLimitPerVariant" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "enterpriseMonthlyPrice" DOUBLE PRECISION NOT NULL DEFAULT 520,
ADD COLUMN     "enterprisePlanLimitPerNetwork" INTEGER NOT NULL DEFAULT -1,
ADD COLUMN     "enterprisePlanLimitPerVariant" INTEGER NOT NULL DEFAULT -1,
ADD COLUMN     "proPlanLimitPerNetwork" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "proPlanLimitPerVariant" INTEGER NOT NULL DEFAULT 6;
