-- DropIndex
DROP INDEX "DemoRequest_status_idx";

-- AlterTable
ALTER TABLE "Gym" ADD COLUMN     "todayVisitorCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "todayVisitorDate" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "lastVisitedAt" TIMESTAMP(3),
ALTER COLUMN "qrToken" SET DEFAULT encode(gen_random_bytes(16), 'hex');
