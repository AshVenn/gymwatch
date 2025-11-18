import { useSession } from "next-auth/react"
import type { GymPlanTier } from "@prisma/client"
import { hasPlanFeature } from "@/lib/subscription-plans"

export function usePlanFeatures() {
  const { data: session } = useSession()
  const tier = (session?.user?.subscriptionPlan ?? "BASIC") as GymPlanTier

  return {
    tier,
    hasQrTools: hasPlanFeature(tier, "qrTools"),
    hasQrDownloads: hasPlanFeature(tier, "qrDownloads"),
    hasCsvReports: hasPlanFeature(tier, "csvReports"),
  }
}
