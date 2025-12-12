-- AlterTable
ALTER TABLE "Member" ALTER COLUMN "qrToken" SET DEFAULT encode(gen_random_bytes(16), 'hex');
