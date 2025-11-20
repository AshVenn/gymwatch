-- CreateEnum
CREATE TYPE "DemoRequestStatus" AS ENUM ('PENDING', 'RESOLVED', 'REFUSED');

-- AlterTable
ALTER TABLE "Gym"
ADD COLUMN "isDemo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "demoEndsAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "DemoRequest" (
    "id" TEXT NOT NULL,
    "gymName" TEXT NOT NULL,
    "gymEmail" TEXT NOT NULL,
    "adminEmail" TEXT NOT NULL,
    "adminFirstName" TEXT,
    "adminLastName" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "plan" "GymPlanTier" NOT NULL,
    "message" TEXT,
    "status" "DemoRequestStatus" NOT NULL DEFAULT 'PENDING',
    "resolvedAt" TIMESTAMP(3),
    "resolvedById" TEXT,
    "resolutionNote" TEXT,
    "createdGymId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DemoRequest_status_idx" ON "DemoRequest"("status");

-- AddForeignKey
ALTER TABLE "DemoRequest" ADD CONSTRAINT "DemoRequest_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoRequest" ADD CONSTRAINT "DemoRequest_createdGymId_fkey" FOREIGN KEY ("createdGymId") REFERENCES "Gym"("id") ON DELETE SET NULL ON UPDATE CASCADE;
