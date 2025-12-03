import { useMemo } from "react"
import { useSession } from "next-auth/react"
import type { GymPlanTier } from "@prisma/client"
import { getPlanFeatures, hasPlanFeature, isMultiLocationPlan } from "@/lib/subscription-plans"


export function usePlanFeatures() {
  const { data: session } = useSession()
  const tier = (session?.user?.subscriptionPlan ?? "BASIC") as GymPlanTier
  const features = useMemo(() => getPlanFeatures(tier), [tier])

  return {
    tier,
    features,
    hasAccessControl: features.accessControl,
    hasPresence: features.presenceTracking,
    hasCourses: features.courses,
    hasQrTools: hasPlanFeature(tier, "qrTools"),
    hasQrDownloads: hasPlanFeature(tier, "qrDownloads"),
    hasExcelReports: hasPlanFeature(tier, "excelReports"),
    hasMultiLocations: isMultiLocationPlan(tier),
  }
}
