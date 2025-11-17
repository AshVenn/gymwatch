-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'GYM_OWNER';

-- AlterTable
ALTER TABLE "Gym"
ADD COLUMN     "maxAdminAccounts" INTEGER NOT NULL DEFAULT 3,
ADD COLUMN     "lastSettingsUpdateAt" TIMESTAMP(3),
ADD COLUMN     "ownerId" TEXT,
ADD CONSTRAINT "Gym_ownerId_key" UNIQUE ("ownerId");

-- AddForeignKey
ALTER TABLE "Gym"
ADD CONSTRAINT "Gym_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "locale" TEXT NOT NULL DEFAULT 'fr',
    "notifications" BOOLEAN NOT NULL DEFAULT true,
    "weeklySummary" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastChangedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- AddForeignKey
ALTER TABLE "UserPreference"
ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
