import { PlanFeatureFlag } from "@prisma/client"
import { prisma } from "./prisma"
import type { FeatureOverrideMap, PlanFeatureKey } from "./subscription-plans"

function toPlanFeatureKey(flag: PlanFeatureFlag): PlanFeatureKey {
  return flag as PlanFeatureKey
}

export async function fetchFeatureOverrides(gymId: string): Promise<FeatureOverrideMap> {
  const rows = await prisma.featureOverride.findMany({
    where: { gymId },
    select: { feature: true, enabled: true },
  })
  return rows.reduce<FeatureOverrideMap>((acc, row) => {
    acc[toPlanFeatureKey(row.feature)] = row.enabled
    return acc
  }, {})
}

export async function upsertFeatureOverride(gymId: string, feature: PlanFeatureKey, enabled: boolean) {
  await prisma.featureOverride.upsert({
    where: { gymId_feature: { gymId, feature: feature as PlanFeatureFlag } },
    update: { enabled },
    create: { gymId, feature: feature as PlanFeatureFlag, enabled },
  })
}
