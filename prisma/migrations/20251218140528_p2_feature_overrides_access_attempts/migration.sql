-- CreateEnum
CREATE TYPE "PlanFeatureFlag" AS ENUM ('accessControl', 'presenceTracking', 'courses', 'qrTools', 'qrDownloads', 'excelReports');

-- AlterTable
ALTER TABLE "Member" ALTER COLUMN "qrToken" SET DEFAULT encode(gen_random_bytes(16), 'hex');

-- CreateTable
CREATE TABLE "FeatureOverride" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "feature" "PlanFeatureFlag" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessAttemptLog" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "memberId" TEXT,
    "gymVariantId" TEXT,
    "status" "AccessEventStatus" NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessAttemptLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeatureOverride_gymId_idx" ON "FeatureOverride"("gymId");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureOverride_gymId_feature_key" ON "FeatureOverride"("gymId", "feature");

-- CreateIndex
CREATE INDEX "AccessAttemptLog_gymId_createdAt_idx" ON "AccessAttemptLog"("gymId", "createdAt");

-- CreateIndex
CREATE INDEX "AccessAttemptLog_memberId_idx" ON "AccessAttemptLog"("memberId");

-- CreateIndex
CREATE INDEX "AccessAttemptLog_gymVariantId_idx" ON "AccessAttemptLog"("gymVariantId");

-- CreateIndex
CREATE INDEX "AccessAttemptLog_status_idx" ON "AccessAttemptLog"("status");

-- AddForeignKey
ALTER TABLE "FeatureOverride" ADD CONSTRAINT "FeatureOverride_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessAttemptLog" ADD CONSTRAINT "AccessAttemptLog_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessAttemptLog" ADD CONSTRAINT "AccessAttemptLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessAttemptLog" ADD CONSTRAINT "AccessAttemptLog_gymVariantId_fkey" FOREIGN KEY ("gymVariantId") REFERENCES "GymVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
