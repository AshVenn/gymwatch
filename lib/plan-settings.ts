import { GymBillingInterval, GymPlanTier } from "@prisma/client"
import { prisma } from "./prisma"
import {
  PLAN_PRICING,
  PlanPricingTable,
  computePricingFromSettings,
  DEFAULT_ANNUAL_DISCOUNT,
  PlanLimitsTable,
  DEFAULT_PLAN_LIMITS,
  computeLimitsFromSettings,
  normalizeLimitValue,
  isUnlimitedLimit,
} from "./subscription-plans"

type PlanSettingsRecord = {
  id: number
  basicMonthlyPrice: number
  proMonthlyPrice: number
  enterpriseMonthlyPrice: number
  annualDiscountPercent: number
  basicPlanLimitPerVariant: number
  basicPlanLimitPerNetwork: number
  proPlanLimitPerVariant: number
  proPlanLimitPerNetwork: number
  enterprisePlanLimitPerVariant: number
  enterprisePlanLimitPerNetwork: number
  createdAt?: Date
  updatedAt?: Date
}

type CachedPlanSettings = {
  settings: PlanSettingsRecord
  pricing: PlanPricingTable
  limits: PlanLimitsTable
  fetchedAt: number
}

const CACHE_TTL_MS = 30_000
const DEFAULT_PLAN_SETTINGS: PlanSettingsRecord = {
  id: 1,
  basicMonthlyPrice: PLAN_PRICING.BASIC.MONTHLY,
  proMonthlyPrice: PLAN_PRICING.PRO.MONTHLY,
  enterpriseMonthlyPrice: PLAN_PRICING.ENTERPRISE.MONTHLY,
  annualDiscountPercent: DEFAULT_ANNUAL_DISCOUNT,
  basicPlanLimitPerVariant: DEFAULT_PLAN_LIMITS.BASIC.perVariant,
  basicPlanLimitPerNetwork: DEFAULT_PLAN_LIMITS.BASIC.perNetwork,
  proPlanLimitPerVariant: DEFAULT_PLAN_LIMITS.PRO.perVariant,
  proPlanLimitPerNetwork: DEFAULT_PLAN_LIMITS.PRO.perNetwork,
  enterprisePlanLimitPerVariant: DEFAULT_PLAN_LIMITS.ENTERPRISE.perVariant,
  enterprisePlanLimitPerNetwork: DEFAULT_PLAN_LIMITS.ENTERPRISE.perNetwork,
}

let cache: CachedPlanSettings | null = null

function clampNumber(value: number | null | undefined, fallback: number, min = 0, max?: number) {
  const safe = Number.isFinite(value) ? Number(value) : fallback
  const aboveMin = Math.max(safe, min)
  return typeof max === "number" ? Math.min(aboveMin, max) : aboveMin
}

function clampLimit(value: number | null | undefined, fallback: number) {
  return normalizeLimitValue(value ?? fallback)
}

function normalizeSettings(input: PlanSettingsRecord): PlanSettingsRecord {
  return {
    ...input,
    id: input.id || 1,
    basicMonthlyPrice: clampNumber(input.basicMonthlyPrice, DEFAULT_PLAN_SETTINGS.basicMonthlyPrice),
    proMonthlyPrice: clampNumber(input.proMonthlyPrice, DEFAULT_PLAN_SETTINGS.proMonthlyPrice),
    enterpriseMonthlyPrice: clampNumber(
      input.enterpriseMonthlyPrice,
      DEFAULT_PLAN_SETTINGS.enterpriseMonthlyPrice,
    ),
    annualDiscountPercent: clampNumber(input.annualDiscountPercent, DEFAULT_PLAN_SETTINGS.annualDiscountPercent, 0, 90),
    basicPlanLimitPerVariant: clampLimit(
      input.basicPlanLimitPerVariant,
      DEFAULT_PLAN_SETTINGS.basicPlanLimitPerVariant,
    ),
    basicPlanLimitPerNetwork: clampLimit(
      input.basicPlanLimitPerNetwork,
      DEFAULT_PLAN_SETTINGS.basicPlanLimitPerNetwork,
    ),
    proPlanLimitPerVariant: clampLimit(input.proPlanLimitPerVariant, DEFAULT_PLAN_SETTINGS.proPlanLimitPerVariant),
    proPlanLimitPerNetwork: clampLimit(input.proPlanLimitPerNetwork, DEFAULT_PLAN_SETTINGS.proPlanLimitPerNetwork),
    enterprisePlanLimitPerVariant: clampLimit(
      input.enterprisePlanLimitPerVariant,
      DEFAULT_PLAN_SETTINGS.enterprisePlanLimitPerVariant,
    ),
    enterprisePlanLimitPerNetwork: clampLimit(
      input.enterprisePlanLimitPerNetwork,
      DEFAULT_PLAN_SETTINGS.enterprisePlanLimitPerNetwork,
    ),
  }
}

function buildCache(settings: PlanSettingsRecord): CachedPlanSettings {
  const normalized = normalizeSettings(settings)
  return {
    settings: normalized,
    pricing: computePricingFromSettings({
      basicMonthlyPrice: normalized.basicMonthlyPrice,
      proMonthlyPrice: normalized.proMonthlyPrice,
      enterpriseMonthlyPrice: normalized.enterpriseMonthlyPrice,
      annualDiscountPercent: normalized.annualDiscountPercent,
    }),
    limits: computeLimitsFromSettings({
      basicPlanLimitPerVariant: normalized.basicPlanLimitPerVariant,
      basicPlanLimitPerNetwork: normalized.basicPlanLimitPerNetwork,
      proPlanLimitPerVariant: normalized.proPlanLimitPerVariant,
      proPlanLimitPerNetwork: normalized.proPlanLimitPerNetwork,
      enterprisePlanLimitPerVariant: normalized.enterprisePlanLimitPerVariant,
      enterprisePlanLimitPerNetwork: normalized.enterprisePlanLimitPerNetwork,
    }),
    fetchedAt: Date.now(),
  }
}

async function readPlanSettings(): Promise<CachedPlanSettings> {
  const settings = await prisma.planSettings.upsert({
    where: { id: 1 },
    update: {},
    create: DEFAULT_PLAN_SETTINGS,
  })
  cache = buildCache(settings)
  return cache
}

export async function getPlanSettings(forceRefresh = false): Promise<CachedPlanSettings> {
  if (!forceRefresh && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache
  }
  return readPlanSettings()
}

export async function updatePlanSettings(
  data: Omit<PlanSettingsRecord, "id" | "createdAt" | "updatedAt">,
): Promise<CachedPlanSettings> {
  const normalized = normalizeSettings({ ...DEFAULT_PLAN_SETTINGS, ...data })
  const updated = await prisma.planSettings.upsert({
    where: { id: 1 },
    update: {
      basicMonthlyPrice: normalized.basicMonthlyPrice,
      proMonthlyPrice: normalized.proMonthlyPrice,
      enterpriseMonthlyPrice: normalized.enterpriseMonthlyPrice,
      annualDiscountPercent: normalized.annualDiscountPercent,
      basicPlanLimitPerVariant: normalized.basicPlanLimitPerVariant,
      basicPlanLimitPerNetwork: normalized.basicPlanLimitPerNetwork,
      proPlanLimitPerVariant: normalized.proPlanLimitPerVariant,
      proPlanLimitPerNetwork: normalized.proPlanLimitPerNetwork,
      enterprisePlanLimitPerVariant: normalized.enterprisePlanLimitPerVariant,
      enterprisePlanLimitPerNetwork: normalized.enterprisePlanLimitPerNetwork,
    },
    create: normalized,
  })

  cache = buildCache(updated)
  return cache
}

export async function resolvePlanPrice(tier: GymPlanTier, interval: GymBillingInterval) {
  const { pricing } = await getPlanSettings()
  return pricing[tier][interval]
}

export async function getPlanPricing(forceRefresh = false) {
  const { pricing } = await getPlanSettings(forceRefresh)
  return pricing
}

export async function getPlanLimits(forceRefresh = false) {
  const { limits } = await getPlanSettings(forceRefresh)
  return limits
}

export async function resolveGymPlanLimits(
  tier: GymPlanTier,
  overrides?: { perVariant?: number | null; perNetwork?: number | null },
) {
  const { limits } = await getPlanSettings()
  const base = limits[tier] ?? limits.BASIC
  const perVariant = clampLimit(overrides?.perVariant, base.perVariant ?? DEFAULT_PLAN_LIMITS.BASIC.perVariant)
  const perNetwork = clampLimit(overrides?.perNetwork, base.perNetwork ?? DEFAULT_PLAN_LIMITS.BASIC.perNetwork)

  return {
    perVariant,
    perNetwork,
    unlimitedPerVariant: isUnlimitedLimit(perVariant),
    unlimitedPerNetwork: isUnlimitedLimit(perNetwork),
    sources: {
      perVariant: overrides?.perVariant === null || overrides?.perVariant === undefined ? "PLAN_DEFAULT" : "GYM_OVERRIDE",
      perNetwork: overrides?.perNetwork === null || overrides?.perNetwork === undefined ? "PLAN_DEFAULT" : "GYM_OVERRIDE",
    } as const,
  }
}

export function clearPlanSettingsCache() {
  cache = null
}
