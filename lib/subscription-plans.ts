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
export type PlanLimits = { perVariant: number | null; perNetwork: number | null }
export type PlanLimitsTable = Record<PlanTier, PlanLimits>

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
  ENTERPRISE: 520,
}

export const DEFAULT_PLAN_LIMITS: PlanLimitsTable = {
  BASIC: { perVariant: 3, perNetwork: 3 },
  PRO: { perVariant: 6, perNetwork: 10 },
  ENTERPRISE: { perVariant: -1, perNetwork: -1 },
}

export function calculateAnnualPrice(monthly: number, discountPercent: number) {
  const safeDiscount = Math.min(Math.max(discountPercent, 0), 90)
  const annual = monthly * 12 * (1 - safeDiscount / 100)
  return Math.round(annual * 100) / 100
}

export function computePricingFromSettings(settings: {
  basicMonthlyPrice: number
  proMonthlyPrice: number
  enterpriseMonthlyPrice: number
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
    ENTERPRISE: {
      MONTHLY: settings.enterpriseMonthlyPrice,
      ANNUAL: calculateAnnualPrice(settings.enterpriseMonthlyPrice, settings.annualDiscountPercent),
    },
  }
}

export const PLAN_PRICING: PlanPricingTable = computePricingFromSettings({
  basicMonthlyPrice: DEFAULT_MONTHLY_PRICING.BASIC,
  proMonthlyPrice: DEFAULT_MONTHLY_PRICING.PRO,
  enterpriseMonthlyPrice: DEFAULT_MONTHLY_PRICING.ENTERPRISE,
  annualDiscountPercent: DEFAULT_ANNUAL_DISCOUNT,
})

export function normalizeLimitValue(value: number | null | undefined) {
  if (value === null || value === undefined) return -1
  const safe = Math.floor(Number(value))
  if (!Number.isFinite(safe)) return -1
  return safe < -1 ? -1 : safe
}

export function computeLimitsFromSettings(settings: {
  basicPlanLimitPerVariant: number
  basicPlanLimitPerNetwork: number
  proPlanLimitPerVariant: number
  proPlanLimitPerNetwork: number
  enterprisePlanLimitPerVariant: number
  enterprisePlanLimitPerNetwork: number
}): PlanLimitsTable {
  return {
    BASIC: {
      perVariant: normalizeLimitValue(settings.basicPlanLimitPerVariant),
      perNetwork: normalizeLimitValue(settings.basicPlanLimitPerNetwork),
    },
    PRO: {
      perVariant: normalizeLimitValue(settings.proPlanLimitPerVariant),
      perNetwork: normalizeLimitValue(settings.proPlanLimitPerNetwork),
    },
    ENTERPRISE: {
      perVariant: normalizeLimitValue(settings.enterprisePlanLimitPerVariant),
      perNetwork: normalizeLimitValue(settings.enterprisePlanLimitPerNetwork),
    },
  }
}

export function isUnlimitedLimit(value: number | null | undefined) {
  return value === null || value < 0
}

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
  ENTERPRISE: {
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
  ENTERPRISE: {
    tier: "ENTERPRISE",
    name: "Enterprise",
    description: "Offre multi-sites avec automations avancees et catalogue illimite",
    highlight: true,
    highlightLabel: "Enterprise",
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
    ENTERPRISE: {
      ...PLAN_METADATA.ENTERPRISE,
      monthlyPrice: pricing.ENTERPRISE.MONTHLY,
      annualPrice: pricing.ENTERPRISE.ANNUAL,
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
  return tier === "ENTERPRISE"
}

export function resolvePlanLimitsForTier(
  tier: GymPlanTier | null | undefined,
  limits: PlanLimitsTable = DEFAULT_PLAN_LIMITS,
) {
  const effectiveTier = tier ?? "BASIC"
  const entry = limits[effectiveTier] ?? limits.BASIC
  return {
    perVariant: entry.perVariant,
    perNetwork: entry.perNetwork,
    unlimitedPerVariant: isUnlimitedLimit(entry.perVariant),
    unlimitedPerNetwork: isUnlimitedLimit(entry.perNetwork),
  }
}
