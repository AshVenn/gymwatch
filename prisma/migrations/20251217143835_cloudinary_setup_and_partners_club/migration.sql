-- AlterTable
ALTER TABLE "Member" ALTER COLUMN "qrToken" SET DEFAULT encode(gen_random_bytes(16), 'hex');

-- CreateTable
CREATE TABLE "PartnerClub" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "logoUrl" TEXT,
    "logoPublicId" TEXT,
    "coverUrl" TEXT,
    "coverPublicId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerClub_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerClubTranslation" (
    "id" SERIAL NOT NULL,
    "partnerId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "tagline" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PartnerClubTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PartnerClub_slug_key" ON "PartnerClub"("slug");

-- CreateIndex
CREATE INDEX "PartnerClubTranslation_locale_idx" ON "PartnerClubTranslation"("locale");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerClubTranslation_partnerId_locale_key" ON "PartnerClubTranslation"("partnerId", "locale");

-- AddForeignKey
ALTER TABLE "PartnerClubTranslation" ADD CONSTRAINT "PartnerClubTranslation_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "PartnerClub"("id") ON DELETE CASCADE ON UPDATE CASCADE;
