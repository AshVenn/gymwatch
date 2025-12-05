import { GymBillingInterval, GymPlanTier } from "@prisma/client"
import { prisma } from "./prisma"
import {
  PLAN_PRICING,
  PlanPricingTable,
  computePricingFromSettings,
  DEFAULT_ANNUAL_DISCOUNT,
} from "./subscription-plans"

type PlanSettingsRecord = {
  id: number
  basicMonthlyPrice: number
  proMonthlyPrice: number
  complexMonthlyPrice: number
  annualDiscountPercent: number
  createdAt?: Date
  updatedAt?: Date
}

type CachedPlanSettings = {
  settings: PlanSettingsRecord
  pricing: PlanPricingTable
  fetchedAt: number
}

const CACHE_TTL_MS = 30_000
const DEFAULT_PLAN_SETTINGS: PlanSettingsRecord = {
  id: 1,
  basicMonthlyPrice: PLAN_PRICING.BASIC.MONTHLY,
  proMonthlyPrice: PLAN_PRICING.PRO.MONTHLY,
  complexMonthlyPrice: PLAN_PRICING.COMPLEX.MONTHLY,
  annualDiscountPercent: DEFAULT_ANNUAL_DISCOUNT,
}

let cache: CachedPlanSettings | null = null

function clampNumber(value: number | null | undefined, fallback: number, min = 0, max?: number) {
  const safe = Number.isFinite(value) ? Number(value) : fallback
  const aboveMin = Math.max(safe, min)
  return typeof max === "number" ? Math.min(aboveMin, max) : aboveMin
}

function normalizeSettings(input: PlanSettingsRecord): PlanSettingsRecord {
  return {
    ...input,
    id: input.id || 1,
    basicMonthlyPrice: clampNumber(input.basicMonthlyPrice, DEFAULT_PLAN_SETTINGS.basicMonthlyPrice),
    proMonthlyPrice: clampNumber(input.proMonthlyPrice, DEFAULT_PLAN_SETTINGS.proMonthlyPrice),
    complexMonthlyPrice: clampNumber(input.complexMonthlyPrice, DEFAULT_PLAN_SETTINGS.complexMonthlyPrice),
    annualDiscountPercent: clampNumber(input.annualDiscountPercent, DEFAULT_PLAN_SETTINGS.annualDiscountPercent, 0, 90),
  }
}

function buildCache(settings: PlanSettingsRecord): CachedPlanSettings {
  const normalized = normalizeSettings(settings)
  return {
    settings: normalized,
    pricing: computePricingFromSettings({
      basicMonthlyPrice: normalized.basicMonthlyPrice,
      proMonthlyPrice: normalized.proMonthlyPrice,
      complexMonthlyPrice: normalized.complexMonthlyPrice,
      annualDiscountPercent: normalized.annualDiscountPercent,
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
      complexMonthlyPrice: normalized.complexMonthlyPrice,
      annualDiscountPercent: normalized.annualDiscountPercent,
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

export function clearPlanSettingsCache() {
  cache = null
}
