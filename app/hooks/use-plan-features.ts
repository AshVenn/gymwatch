import { useMemo } from "react"
import { useSession } from "next-auth/react"
import { useQuery } from "@tanstack/react-query"
import type { GymPlanTier } from "@prisma/client"

import { applyFeatureOverrides, getPlanFeatures, hasPlanFeature, isMultiLocationPlan } from "@/lib/subscription-plans"

type FeatureResponse = {
  tier: GymPlanTier | null
  features: ReturnType<typeof getPlanFeatures>
  overrides: Record<string, boolean>
  base: ReturnType<typeof getPlanFeatures>
}

export function usePlanFeatures() {
  const { data: session } = useSession()
  const gymId = (session?.user as any)?.gymId as string | undefined
  const sessionTier = (session?.user?.subscriptionPlan ?? "BASIC") as GymPlanTier

  const featureQuery = useQuery<FeatureResponse>({
    queryKey: ["gym-features", gymId],
    enabled: Boolean(gymId),
    queryFn: async () => {
      const response = await fetch("/api/gym-team/features")
      if (!response.ok) {
        throw new Error("Unable to load features")
      }
      return response.json()
    },
    staleTime: 60_000,
  })

  const tier = (featureQuery.data?.tier ?? sessionTier ?? "BASIC") as GymPlanTier
  const overrides = featureQuery.data?.overrides ?? {}

  const features = useMemo(() => {
    if (featureQuery.data?.features) return featureQuery.data.features
    const base = getPlanFeatures(tier)
    return applyFeatureOverrides(base, overrides)
  }, [featureQuery.data?.features, overrides, tier])

  return {
    tier,
    features,
    overrides,
    hasAccessControl: features.accessControl,
    hasPresence: features.presenceTracking,
    hasCourses: features.courses,
    hasQrTools: hasPlanFeature(tier, "qrTools", features),
    hasQrDownloads: hasPlanFeature(tier, "qrDownloads", features),
    hasExcelReports: hasPlanFeature(tier, "excelReports", features),
    hasMultiLocations: isMultiLocationPlan(tier),
    isLoading: featureQuery.isLoading,
    isError: featureQuery.isError,
  }
}
