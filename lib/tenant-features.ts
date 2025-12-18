import type { GymPlanTier } from "@prisma/client"

import {
  applyFeatureOverrides,
  getPlanFeatures,
  type FeatureOverrideMap,
  type PlanFeatureKey,
  type PlanFeatures,
} from "./subscription-plans"
import { prisma } from "./prisma"

export async function loadFeatureOverrides(gymId: string): Promise<FeatureOverrideMap> {
  const rows = await prisma.featureOverride.findMany({
    where: { gymId },
    select: { feature: true, enabled: true },
  })

  return rows.reduce<FeatureOverrideMap>((acc, row) => {
    acc[row.feature as PlanFeatureKey] = row.enabled
    return acc
  }, {})
}

export async function resolveGymFeatures(options: { gymId: string; tier?: GymPlanTier | null }): Promise<{
  features: PlanFeatures
  overrides: FeatureOverrideMap
}> {
  const { gymId, tier } = options
  const [overrides, gymPlan] = await Promise.all([
    loadFeatureOverrides(gymId),
    tier
      ? Promise.resolve(tier)
      : prisma.gym.findUnique({
          where: { id: gymId },
          select: { subscriptionPlan: true },
        }),
  ])

  const planTier: GymPlanTier | null =
    typeof gymPlan === "string"
      ? gymPlan
      : gymPlan && "subscriptionPlan" in gymPlan
        ? (gymPlan.subscriptionPlan as GymPlanTier)
        : null

  const baseFeatures = getPlanFeatures(planTier)
  return {
    features: applyFeatureOverrides(baseFeatures, overrides),
    overrides,
  }
}
