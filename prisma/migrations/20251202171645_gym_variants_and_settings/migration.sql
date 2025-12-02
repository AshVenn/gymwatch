-- AlterTable
ALTER TABLE "GymVariant" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Member" ALTER COLUMN "qrToken" SET DEFAULT encode(gen_random_bytes(16), 'hex');

-- AlterTable
ALTER TABLE "SystemSettings" ALTER COLUMN "updatedAt" DROP DEFAULT;
