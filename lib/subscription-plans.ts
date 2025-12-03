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

export const PLAN_PRICING: Record<PlanTier, Record<GymBillingInterval, number>> = {
  BASIC: {
    MONTHLY: 200,
    ANNUAL: 2000,
  },
  PRO: {
    MONTHLY: 350,
    ANNUAL: 3300,
  },
  COMPLEX: {
    MONTHLY: 520,
    ANNUAL: 5200,
  },
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
  COMPLEX: {
    accessControl: true,
    presenceTracking: true,
    courses: true,
    qrTools: true,
    qrDownloads: true,
    excelReports: true,
  },
}

export const PLAN_CATALOG: Record<PlanTier, PlanCatalogEntry> = {
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
    badges: ["QR codes", "Exports Excel"],
    features: [
      "Tout le plan Basic",
      "Controle d'acces par QR code",
      "Suivi de presence en temps reel",
      "Alertes audio succes/echec",
      "Exports Excel revenus & fidelite",
      "Exports PDF/Excel multi-salles",
    ],
    monthlyPrice: PLAN_PRICING.PRO.MONTHLY,
    annualPrice: PLAN_PRICING.PRO.ANNUAL,
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
    monthlyPrice: PLAN_PRICING.COMPLEX.MONTHLY,
    annualPrice: PLAN_PRICING.COMPLEX.ANNUAL,
  },
}

export function resolvePlanPrice(tier: PlanTier, interval: GymBillingInterval) {
  return PLAN_PRICING[tier][interval]
}

export function getPlanFeatures(tier: GymPlanTier | null | undefined): PlanFeatures {
  if (!tier) return EMPTY_FEATURES
  return FEATURE_MATRIX[tier] ?? EMPTY_FEATURES
}

export function hasPlanFeature(tier: GymPlanTier | null | undefined, feature: PlanFeatureKey) {
  const features = getPlanFeatures(tier)
  return Boolean(features[feature])
}

export function getPlanCatalogAsList(): PlanCatalogEntry[] {
  return Object.values(PLAN_CATALOG)
}

export function isMultiLocationPlan(tier: GymPlanTier | null | undefined) {
  return tier === "COMPLEX"
}
