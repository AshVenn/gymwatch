import { GymBillingInterval, GymPlanTier } from "@prisma/client"

export type PlanTier = GymPlanTier
export type PlanFeatureKey =
  | "accessControl"
  | "presenceTracking"
  | "courses"
  | "qrTools"
  | "qrDownloads"
  | "excelReports"
export type PlanFeatures = Record<PlanFeatureKey, boolean>
export type PlanPricingTable = Record<PlanTier, Record<GymBillingInterval, number>>

export interface PlanCatalogEntry {
  tier: PlanTier
  name: string
  description: string
  highlight?: boolean
  highlightLabel?: string
  badges: string[]
  features: string[]
  monthlyPrice: number
  annualPrice: number
}

export const DEFAULT_ANNUAL_DISCOUNT = 15

const DEFAULT_MONTHLY_PRICING: Record<PlanTier, number> = {
  BASIC: 200,
  PRO: 350,
  COMPLEX: 520,
}

export function calculateAnnualPrice(monthly: number, discountPercent: number) {
  const safeDiscount = Math.min(Math.max(discountPercent, 0), 90)
  const annual = monthly * 12 * (1 - safeDiscount / 100)
  return Math.round(annual * 100) / 100
}

export function computePricingFromSettings(settings: {
  basicMonthlyPrice: number
  proMonthlyPrice: number
  complexMonthlyPrice: number
  annualDiscountPercent: number
}): PlanPricingTable {
  return {
    BASIC: {
      MONTHLY: settings.basicMonthlyPrice,
      ANNUAL: calculateAnnualPrice(settings.basicMonthlyPrice, settings.annualDiscountPercent),
    },
    PRO: {
      MONTHLY: settings.proMonthlyPrice,
      ANNUAL: calculateAnnualPrice(settings.proMonthlyPrice, settings.annualDiscountPercent),
    },
    COMPLEX: {
      MONTHLY: settings.complexMonthlyPrice,
      ANNUAL: calculateAnnualPrice(settings.complexMonthlyPrice, settings.annualDiscountPercent),
    },
  }
}

export const PLAN_PRICING: PlanPricingTable = computePricingFromSettings({
  basicMonthlyPrice: DEFAULT_MONTHLY_PRICING.BASIC,
  proMonthlyPrice: DEFAULT_MONTHLY_PRICING.PRO,
  complexMonthlyPrice: DEFAULT_MONTHLY_PRICING.COMPLEX,
  annualDiscountPercent: DEFAULT_ANNUAL_DISCOUNT,
})

const EMPTY_FEATURES: PlanFeatures = {
  accessControl: false,
  presenceTracking: false,
  courses: false,
  qrTools: false,
  qrDownloads: false,
  excelReports: false,
}

const FEATURE_MATRIX: Record<PlanTier, PlanFeatures> = {
  BASIC: {
    ...EMPTY_FEATURES,
  },
  PRO: {
    ...EMPTY_FEATURES,
    accessControl: true,
    presenceTracking: true,
    qrTools: true,
    qrDownloads: true,
    excelReports: true,
  },
  COMPLEX: {
    accessControl: true,
    presenceTracking: true,
    courses: true,
    qrTools: true,
    qrDownloads: true,
    excelReports: true,
  },
}

const PLAN_METADATA: Record<PlanTier, Omit<PlanCatalogEntry, "monthlyPrice" | "annualPrice">> = {
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
  },
  PRO: {
    tier: "PRO",
    name: "Pro",
    description: "Automatisations, QR codes et exports avances",
    badges: ["QR codes", "Exports Excel"],
    features: [
      "Tout le plan Basic",
      "Controle d'acces par QR code",
      "Suivi de presence en temps reel",
      "Alertes audio succes/echec",
      "Exports Excel revenus & fidelite",
      "Exports PDF/Excel multi-salles",
    ],
  },
  COMPLEX: {
    tier: "COMPLEX",
    name: "Complex",
    description: "Offre multi-sites avec automations avancees et equipe illimitee",
    highlight: true,
    highlightLabel: "Complex",
    badges: ["Multi-salles illimitees", "Automatisations", "Cours & planning"],
    features: [
      "Salles et utilisateurs illimites",
      "Controle d'acces avance (QR, badge, app membre)",
      "Suivi de presence multi-sites",
      "Gestion des cours et planning (multi-equipes)",
      "Exports CSV/PDF completes",
      "Statistiques detaillees multi-sites",
      "Scenarios marketing (emails/SMS) en preparation",
    ],
  },
}

export function getPlanCatalog(pricing: PlanPricingTable = PLAN_PRICING): Record<PlanTier, PlanCatalogEntry> {
  return {
    BASIC: { ...PLAN_METADATA.BASIC, monthlyPrice: pricing.BASIC.MONTHLY, annualPrice: pricing.BASIC.ANNUAL },
    PRO: { ...PLAN_METADATA.PRO, monthlyPrice: pricing.PRO.MONTHLY, annualPrice: pricing.PRO.ANNUAL },
    COMPLEX: {
      ...PLAN_METADATA.COMPLEX,
      monthlyPrice: pricing.COMPLEX.MONTHLY,
      annualPrice: pricing.COMPLEX.ANNUAL,
    },
  }
}

export const PLAN_CATALOG = getPlanCatalog()

export function getPlanFeatures(tier: GymPlanTier | null | undefined): PlanFeatures {
  if (!tier) return EMPTY_FEATURES
  return FEATURE_MATRIX[tier] ?? EMPTY_FEATURES
}

export function hasPlanFeature(tier: GymPlanTier | null | undefined, feature: PlanFeatureKey) {
  const features = getPlanFeatures(tier)
  return Boolean(features[feature])
}

export function getPlanCatalogAsList(pricing?: PlanPricingTable): PlanCatalogEntry[] {
  return Object.values(getPlanCatalog(pricing ?? PLAN_PRICING))
}

export function isMultiLocationPlan(tier: GymPlanTier | null | undefined) {
  return tier === "COMPLEX"
}
