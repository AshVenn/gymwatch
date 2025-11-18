import { GymPlanTier, GymBillingInterval } from "@prisma/client"

export type PlanFeatureKey = "qrTools" | "qrDownloads" | "excelReports"

export interface PlanCatalogEntry {
  tier: GymPlanTier
  name: string
  description: string
  highlight?: boolean
  badges: string[]
  features: string[]
  monthlyPrice: number
  annualPrice: number
}

export const PLAN_PRICING: Record<GymPlanTier, Record<GymBillingInterval, number>> = {
  BASIC: {
    MONTHLY: 200,
    ANNUAL: 2000,
  },
  PRO: {
    MONTHLY: 350,
    ANNUAL: 3300,
  },
}

const FEATURE_MATRIX: Record<GymPlanTier, Record<PlanFeatureKey, boolean>> = {
  BASIC: {
    qrTools: false,
    qrDownloads: false,
    excelReports: false,
  },
  PRO: {
    qrTools: true,
    qrDownloads: true,
    excelReports: true,
  },
}

export const PLAN_CATALOG: Record<GymPlanTier, PlanCatalogEntry> = {
  BASIC: {
    tier: "BASIC",
    name: "Basic",
    description: "Fonctionnalites essentielles pour centraliser vos membres",
    badges: ["Support email", "Alertes d'echeance"],
    features: [
      "Gestion des membres et abonnements",
      "Alertes d'expiration et relances",
      "Analyses essentielles",
      "Support email prioritaire",
    ],
    monthlyPrice: PLAN_PRICING.BASIC.MONTHLY,
    annualPrice: PLAN_PRICING.BASIC.ANNUAL,
  },
  PRO: {
    tier: "PRO",
    name: "Pro",
    description: "Automatisations, QR codes et exports avances",
    highlight: true,
    badges: ["QR codes", "Exports Excel"],
    features: [
      "Tout le plan Basic",
      "QR codes membres (generation + scan)",
      "Alertes audio succes/echec",
      "Exports Excel revenus & fidelite",
      "Exports PDF/Excel multi-salles",
    ],
    monthlyPrice: PLAN_PRICING.PRO.MONTHLY,
    annualPrice: PLAN_PRICING.PRO.ANNUAL,
  },
}

export function resolvePlanPrice(tier: GymPlanTier, interval: GymBillingInterval) {
  return PLAN_PRICING[tier][interval]
}

export function hasPlanFeature(tier: GymPlanTier | null | undefined, feature: PlanFeatureKey) {
  if (!tier) return false
  return FEATURE_MATRIX[tier][feature]
}

export function getPlanCatalogAsList(): PlanCatalogEntry[] {
  return Object.values(PLAN_CATALOG)
}
