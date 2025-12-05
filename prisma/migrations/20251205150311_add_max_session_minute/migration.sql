-- AlterTable
ALTER TABLE "Gym" ADD COLUMN     "maxSessionMinutes" INTEGER NOT NULL DEFAULT 180;

-- AlterTable
ALTER TABLE "Member" ALTER COLUMN "qrToken" SET DEFAULT encode(gen_random_bytes(16), 'hex');

-- AlterTable
ALTER TABLE "Visit" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "PlanSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "basicMonthlyPrice" DOUBLE PRECISION NOT NULL DEFAULT 200,
    "proMonthlyPrice" DOUBLE PRECISION NOT NULL DEFAULT 350,
    "complexMonthlyPrice" DOUBLE PRECISION NOT NULL DEFAULT 520,
    "annualDiscountPercent" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanSettings_pkey" PRIMARY KEY ("id")
);
