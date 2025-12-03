-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "gymVariantId" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOut" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Visit_gymId_idx" ON "Visit"("gymId");
CREATE INDEX "Visit_memberId_idx" ON "Visit"("memberId");
CREATE INDEX "Visit_gymVariantId_idx" ON "Visit"("gymVariantId");
CREATE INDEX "Visit_checkIn_idx" ON "Visit"("checkIn");

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_gymVariantId_fkey" FOREIGN KEY ("gymVariantId") REFERENCES "GymVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
