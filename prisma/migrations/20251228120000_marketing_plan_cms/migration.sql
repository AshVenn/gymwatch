-- CreateTable
CREATE TABLE "MarketingPlan" (
    "id" TEXT NOT NULL,
    "tier" "GymPlanTier" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "highlight" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingPlanTranslation" (
    "id" SERIAL NOT NULL,
    "planId" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "highlightLabel" TEXT,
    "badges" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "features" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingPlanTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MarketingPlan_tier_key" ON "MarketingPlan"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingPlanTranslation_planId_locale_key" ON "MarketingPlanTranslation"("planId", "locale");

-- CreateIndex
CREATE INDEX "MarketingPlanTranslation_locale_idx" ON "MarketingPlanTranslation"("locale");

-- AddForeignKey
ALTER TABLE "MarketingPlanTranslation" ADD CONSTRAINT "MarketingPlanTranslation_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MarketingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
