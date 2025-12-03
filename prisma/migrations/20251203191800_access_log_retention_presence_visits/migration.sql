-- CreateEnum
CREATE TYPE "AccessEventStatus" AS ENUM ('GRANTED', 'ALREADY_CHECKED_IN', 'DENIED_EXPIRED', 'DENIED_INACTIVE', 'DENIED_FORBIDDEN');

-- CreateEnum
CREATE TYPE "AccessEventSource" AS ENUM ('QR_SCAN', 'SIMULATOR', 'MANUAL');

-- CreateEnum
CREATE TYPE "ClassBookingStatus" AS ENUM ('CONFIRMED', 'WAITLISTED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "GymPlanTier" ADD VALUE 'COMPLEX';

-- AlterTable
ALTER TABLE "Member" ALTER COLUMN "qrToken" SET DEFAULT encode(gen_random_bytes(16), 'hex');

-- CreateTable
CREATE TABLE "AccessEvent" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "AccessEventStatus" NOT NULL,
    "source" "AccessEventSource" NOT NULL DEFAULT 'SIMULATOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSession" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "gymVariantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "coach" TEXT,
    "room" TEXT,
    "capacity" INTEGER NOT NULL DEFAULT 0,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "waitlist" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassBooking" (
    "id" TEXT NOT NULL,
    "classSessionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" "ClassBookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassBooking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AccessEvent_memberId_idx" ON "AccessEvent"("memberId");

-- CreateIndex
CREATE INDEX "AccessEvent_createdAt_idx" ON "AccessEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ClassSession_gymId_idx" ON "ClassSession"("gymId");

-- CreateIndex
CREATE INDEX "ClassSession_gymVariantId_idx" ON "ClassSession"("gymVariantId");

-- CreateIndex
CREATE INDEX "ClassSession_startAt_idx" ON "ClassSession"("startAt");

-- CreateIndex
CREATE INDEX "ClassBooking_memberId_idx" ON "ClassBooking"("memberId");

-- CreateIndex
CREATE INDEX "ClassBooking_status_idx" ON "ClassBooking"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ClassBooking_classSessionId_memberId_key" ON "ClassBooking"("classSessionId", "memberId");

-- AddForeignKey
ALTER TABLE "AccessEvent" ADD CONSTRAINT "AccessEvent_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSession" ADD CONSTRAINT "ClassSession_gymVariantId_fkey" FOREIGN KEY ("gymVariantId") REFERENCES "GymVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassBooking" ADD CONSTRAINT "ClassBooking_classSessionId_fkey" FOREIGN KEY ("classSessionId") REFERENCES "ClassSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassBooking" ADD CONSTRAINT "ClassBooking_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
