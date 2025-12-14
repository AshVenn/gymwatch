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

/**
 * ✅ Default (non-i18n) metadata.
 * On le garde pour ne rien casser si tu ne passes pas encore par next-intl ici.
 */
const PLAN_METADATA: Record<PlanTier, Omit<PlanCatalogEntry, "monthlyPrice" | "annualPrice">> = {
  BASIC: {
    tier: "BASIC",
    name: "Basic",
    description: "Fonctionnalités essentielles pour centraliser vos membres",
    badges: ["Support email", "Alertes d’échéance"],
    features: [
      "Gestion des membres et abonnements",
      "Alertes d’expiration et relances",
      "Analyses essentielles",
      "Support email prioritaire",
    ],
  },
  PRO: {
    tier: "PRO",
    name: "Pro",
    description: "Automatisations, QR codes et exports avancés",
    badges: ["QR codes", "Exports Excel"],
    features: [
      "Tout le plan Basic",
      "Contrôle d’accès par QR code",
      "Suivi de présence en temps réel",
      "Alertes audio succès/échec",
      "Exports Excel revenus & fidélité",
      "Exports PDF/Excel multi-salles",
    ],
  },
  ENTERPRISE: {
    tier: "ENTERPRISE",
    name: "Enterprise",
    description: "Offre multi-sites avec automatisations avancées et catalogue illimité",
    highlight: true,
    highlightLabel: "Enterprise",
    badges: ["Multi-salles illimitées", "Automatisations", "Cours & planning"],
    features: [
      "Salles et utilisateurs illimités",
      "Contrôle d’accès avancé (QR, badge, app membre)",
      "Suivi de présence multi-sites",
      "Gestion des cours et planning (multi-équipes)",
      "Exports CSV/PDF complets",
      "Statistiques détaillées multi-sites",
      "Scénarios marketing (emails/SMS) en préparation",
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

/* -------------------------------------------------------------------------------------------------
 * ✅ i18n (next-intl) versions — opt-in, ne cassent rien
 * Utilisation:
 * const tPlans = await getTranslations({ locale, namespace: "subscriptionPlans" })
 * const list = getPlanCatalogAsListLocalized(tPlans)
 * ------------------------------------------------------------------------------------------------- */

type Translator = (key: string, values?: Record<string, any>) => string

type PlanCatalogEntryKeyed = {
  tier: PlanTier
  nameKey: string
  descriptionKey: string
  highlight?: boolean
  highlightLabelKey?: string
  badgesKeys: string[]
  featuresKeys: string[]
}

const PLAN_METADATA_KEYS: Record<PlanTier, PlanCatalogEntryKeyed> = {
  BASIC: {
    tier: "BASIC",
    nameKey: "tiers.basic.name",
    descriptionKey: "tiers.basic.description",
    badgesKeys: ["tiers.basic.badges.0", "tiers.basic.badges.1"],
    featuresKeys: [
      "tiers.basic.features.0",
      "tiers.basic.features.1",
      "tiers.basic.features.2",
      "tiers.basic.features.3",
    ],
  },
  PRO: {
    tier: "PRO",
    nameKey: "tiers.pro.name",
    descriptionKey: "tiers.pro.description",
    badgesKeys: ["tiers.pro.badges.0", "tiers.pro.badges.1"],
    featuresKeys: [
      "tiers.pro.features.0",
      "tiers.pro.features.1",
      "tiers.pro.features.2",
      "tiers.pro.features.3",
      "tiers.pro.features.4",
      "tiers.pro.features.5",
    ],
  },
  ENTERPRISE: {
    tier: "ENTERPRISE",
    nameKey: "tiers.enterprise.name",
    descriptionKey: "tiers.enterprise.description",
    highlight: true,
    highlightLabelKey: "tiers.enterprise.highlightLabel",
    badgesKeys: ["tiers.enterprise.badges.0", "tiers.enterprise.badges.1", "tiers.enterprise.badges.2"],
    featuresKeys: [
      "tiers.enterprise.features.0",
      "tiers.enterprise.features.1",
      "tiers.enterprise.features.2",
      "tiers.enterprise.features.3",
      "tiers.enterprise.features.4",
      "tiers.enterprise.features.5",
      "tiers.enterprise.features.6",
    ],
  },
}

function tList(t: Translator, keys: string[]) {
  return keys.map((k) => t(k))
}

export function getPlanCatalogLocalized(
  t: Translator,
  pricing: PlanPricingTable = PLAN_PRICING,
): Record<PlanTier, PlanCatalogEntry> {
  return {
    BASIC: {
      tier: "BASIC",
      name: t(PLAN_METADATA_KEYS.BASIC.nameKey),
      description: t(PLAN_METADATA_KEYS.BASIC.descriptionKey),
      badges: tList(t, PLAN_METADATA_KEYS.BASIC.badgesKeys),
      features: tList(t, PLAN_METADATA_KEYS.BASIC.featuresKeys),
      monthlyPrice: pricing.BASIC.MONTHLY,
      annualPrice: pricing.BASIC.ANNUAL,
    },
    PRO: {
      tier: "PRO",
      name: t(PLAN_METADATA_KEYS.PRO.nameKey),
      description: t(PLAN_METADATA_KEYS.PRO.descriptionKey),
      badges: tList(t, PLAN_METADATA_KEYS.PRO.badgesKeys),
      features: tList(t, PLAN_METADATA_KEYS.PRO.featuresKeys),
      monthlyPrice: pricing.PRO.MONTHLY,
      annualPrice: pricing.PRO.ANNUAL,
    },
    ENTERPRISE: {
      tier: "ENTERPRISE",
      name: t(PLAN_METADATA_KEYS.ENTERPRISE.nameKey),
      description: t(PLAN_METADATA_KEYS.ENTERPRISE.descriptionKey),
      highlight: true,
      highlightLabel: PLAN_METADATA_KEYS.ENTERPRISE.highlightLabelKey
        ? t(PLAN_METADATA_KEYS.ENTERPRISE.highlightLabelKey)
        : undefined,
      badges: tList(t, PLAN_METADATA_KEYS.ENTERPRISE.badgesKeys),
      features: tList(t, PLAN_METADATA_KEYS.ENTERPRISE.featuresKeys),
      monthlyPrice: pricing.ENTERPRISE.MONTHLY,
      annualPrice: pricing.ENTERPRISE.ANNUAL,
    },
  }
}

export function getPlanCatalogAsListLocalized(t: Translator, pricing?: PlanPricingTable): PlanCatalogEntry[] {
  return Object.values(getPlanCatalogLocalized(t, pricing ?? PLAN_PRICING))
}
