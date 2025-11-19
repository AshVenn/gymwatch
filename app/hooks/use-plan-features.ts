import { useSession } from "next-auth/react"
import { hasPlanFeature } from "@/lib/subscription-plans"

type GymPlanTier = "BASIC" | "PRO"

export function usePlanFeatures() {
  const { data: session } = useSession()
  const tier = (session?.user?.subscriptionPlan ?? "BASIC") as GymPlanTier

  return {
    tier,
    hasQrTools: hasPlanFeature(tier, "qrTools"),
    hasQrDownloads: hasPlanFeature(tier, "qrDownloads"),
    hasExcelReports: hasPlanFeature(tier, "excelReports"),
  }
}
