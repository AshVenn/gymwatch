
-- Enable pgcrypto for random identifiers if not already present
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- New table to support per-gym variants / zones
CREATE TABLE "GymVariant" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GymVariant_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GymVariant_gymId_slug_key" ON "GymVariant"("gymId", "slug");

ALTER TABLE "GymVariant" ADD CONSTRAINT "GymVariant_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- System settings (replaces environment variables for intervals)
CREATE TABLE "SystemSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "supportEmail" TEXT NOT NULL DEFAULT 'support@gymwatch.ma',
    "supportPhone" TEXT NOT NULL DEFAULT '+212600000000',
    "brandColor" TEXT NOT NULL DEFAULT '#5b4bff',
    "expiryReminder" BOOLEAN NOT NULL DEFAULT true,
    "weeklyDigest" BOOLEAN NOT NULL DEFAULT true,
    "incidentAlerts" BOOLEAN NOT NULL DEFAULT true,
    "payoutReport" BOOLEAN NOT NULL DEFAULT false,
    "gymSettingsIntervalMs" INTEGER NOT NULL DEFAULT 60000,
    "userSettingsIntervalMs" INTEGER NOT NULL DEFAULT 30000,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SystemSettings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "SystemSettings" (
  "id",
  "supportEmail",
  "supportPhone",
  "brandColor",
  "expiryReminder",
  "weeklyDigest",
  "incidentAlerts",
  "payoutReport",
  "gymSettingsIntervalMs",
  "userSettingsIntervalMs"
) VALUES (
  1,
  'support@gymwatch.ma',
  '+212600000000',
  '#5b4bff',
  true,
  true,
  true,
  false,
  60000,
  30000
) ON CONFLICT ("id") DO NOTHING;

-- New variant foreign keys
ALTER TABLE "User" ADD COLUMN     "gymVariantId" TEXT;

ALTER TABLE "MembershipPlan" ADD COLUMN     "gymVariantId" TEXT;

ALTER TABLE "Member" ADD COLUMN     "gymVariantId" TEXT;

ALTER TABLE "Subscription" ADD COLUMN     "gymVariantId" TEXT;

-- Create a default variant for each existing gym
INSERT INTO "GymVariant" ("id", "gymId", "name", "slug", "isDefault", "createdAt", "updatedAt")
SELECT
  CONCAT('var_', encode(gen_random_bytes(10), 'hex')),
  g."id",
  'Principal',
  'principal',
  true,
  NOW(),
  NOW()
FROM "Gym" g
ON CONFLICT ("gymId", "slug") DO NOTHING;

-- Backfill variant references
UPDATE "MembershipPlan" mp
SET "gymVariantId" = gv."id"
FROM "GymVariant" gv
WHERE mp."gymId" = gv."gymId" AND gv."isDefault" = true;

UPDATE "Member" m
SET "gymVariantId" = gv."id"
FROM "GymVariant" gv
WHERE m."gymId" = gv."gymId" AND gv."isDefault" = true;

UPDATE "Subscription" s
SET "gymVariantId" = gv."id"
FROM "GymVariant" gv
WHERE s."gymId" = gv."gymId" AND gv."isDefault" = true;

UPDATE "User" u
SET "gymVariantId" = gv."id"
FROM "GymVariant" gv
WHERE u."gymId" = gv."gymId" AND gv."isDefault" = true AND u."role" = 'GYM_ADMIN';

-- Enforce not null now that data is backfilled
ALTER TABLE "MembershipPlan" ALTER COLUMN "gymVariantId" SET NOT NULL;
ALTER TABLE "Member" ALTER COLUMN "gymVariantId" SET NOT NULL;
ALTER TABLE "Subscription" ALTER COLUMN "gymVariantId" SET NOT NULL;

-- FK + indexes for new columns
ALTER TABLE "User" ADD CONSTRAINT "User_gymVariantId_fkey" FOREIGN KEY ("gymVariantId") REFERENCES "GymVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MembershipPlan" ADD CONSTRAINT "MembershipPlan_gymVariantId_fkey" FOREIGN KEY ("gymVariantId") REFERENCES "GymVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Member" ADD CONSTRAINT "Member_gymVariantId_fkey" FOREIGN KEY ("gymVariantId") REFERENCES "GymVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_gymVariantId_fkey" FOREIGN KEY ("gymVariantId") REFERENCES "GymVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "MembershipPlan_gymVariantId_idx" ON "MembershipPlan"("gymVariantId");
CREATE INDEX "Member_gymVariantId_idx" ON "Member"("gymVariantId");
CREATE INDEX "Subscription_gymVariantId_idx" ON "Subscription"("gymVariantId");
