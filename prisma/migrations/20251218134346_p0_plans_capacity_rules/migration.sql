-- CreateEnum
CREATE TYPE "AccessRuleType" AS ENUM ('OVERSTAY', 'ENTRY_BURST', 'CAPACITY_RISK', 'STALE_OPEN_VISIT');

-- CreateEnum
CREATE TYPE "AccessRuleSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "GymFreezeStatus" AS ENUM ('ACTIVE', 'LIFTED');

-- AlterTable
ALTER TABLE "Gym" ADD COLUMN     "capacity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maxDailyCheckIns" INTEGER NOT NULL DEFAULT -1,
ADD COLUMN     "maxMembers" INTEGER NOT NULL DEFAULT -1,
ADD COLUMN     "maxVariants" INTEGER NOT NULL DEFAULT -1;

-- AlterTable
ALTER TABLE "GymVariant" ADD COLUMN     "capacity" INTEGER DEFAULT 0;

-- AlterTable
ALTER TABLE "Member" ALTER COLUMN "qrToken" SET DEFAULT encode(gen_random_bytes(16), 'hex');

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "overstayMinutes" INTEGER DEFAULT 0;

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" "GymPlanTier" NOT NULL,
    "billingInterval" "GymBillingInterval" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxVariants" INTEGER NOT NULL DEFAULT -1,
    "maxMembers" INTEGER NOT NULL DEFAULT -1,
    "maxDailyCheckIns" INTEGER NOT NULL DEFAULT -1,
    "capacityPerGym" INTEGER NOT NULL DEFAULT 0,
    "capacityPerVariant" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantPlan" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "GymSubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 0,
    "freezeStatus" "GymFreezeStatus",
    "freezeReason" TEXT,
    "freezeUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantPlanFreeze" (
    "id" TEXT NOT NULL,
    "tenantPlanId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "requestedUntil" TIMESTAMP(3),
    "liftedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantPlanFreeze_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessRuleEvent" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "memberId" TEXT,
    "visitId" TEXT,
    "gymVariantId" TEXT,
    "type" "AccessRuleType" NOT NULL,
    "severity" "AccessRuleSeverity" NOT NULL DEFAULT 'INFO',
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessRuleEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_tier_billingInterval_key" ON "Plan"("tier", "billingInterval");

-- CreateIndex
CREATE INDEX "TenantPlan_gymId_status_idx" ON "TenantPlan"("gymId", "status");

-- CreateIndex
CREATE INDEX "TenantPlan_planId_idx" ON "TenantPlan"("planId");

-- CreateIndex
CREATE INDEX "AccessRuleEvent_gymId_createdAt_idx" ON "AccessRuleEvent"("gymId", "createdAt");

-- CreateIndex
CREATE INDEX "AccessRuleEvent_memberId_idx" ON "AccessRuleEvent"("memberId");

-- CreateIndex
CREATE INDEX "AccessRuleEvent_visitId_idx" ON "AccessRuleEvent"("visitId");

-- CreateIndex
CREATE INDEX "AccessRuleEvent_gymVariantId_idx" ON "AccessRuleEvent"("gymVariantId");

-- AddForeignKey
ALTER TABLE "TenantPlan" ADD CONSTRAINT "TenantPlan_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantPlan" ADD CONSTRAINT "TenantPlan_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantPlanFreeze" ADD CONSTRAINT "TenantPlanFreeze_tenantPlanId_fkey" FOREIGN KEY ("tenantPlanId") REFERENCES "TenantPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRuleEvent" ADD CONSTRAINT "AccessRuleEvent_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRuleEvent" ADD CONSTRAINT "AccessRuleEvent_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRuleEvent" ADD CONSTRAINT "AccessRuleEvent_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "Visit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRuleEvent" ADD CONSTRAINT "AccessRuleEvent_gymVariantId_fkey" FOREIGN KEY ("gymVariantId") REFERENCES "GymVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
