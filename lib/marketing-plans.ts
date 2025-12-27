import type { GymPlanTier, MarketingPlan, MarketingPlanTranslation } from "@prisma/client"

import { routing, type AppLocale } from "@/i18n/routing"

import { prisma } from "./prisma"

type TranslationInput = {
  name: string
  description?: string | null
  highlightLabel?: string | null
  badges?: string[]
  features?: string[]
}

export type MarketingPlanAdminPayload = {
  id: string
  tier: GymPlanTier
  order: number
  isPublished: boolean
  highlight: boolean
  translations: Partial<Record<AppLocale, TranslationInput>>
  createdAt: Date
  updatedAt: Date
}

export type MarketingPlanPublicPayload = {
  id: string
  tier: GymPlanTier
  order: number
  highlight: boolean
  highlightLabel?: string
  name: string
  description?: string | null
  badges: string[]
  features: string[]
}

export type MarketingPlanInput = {
  tier?: GymPlanTier
  order?: number
  isPublished?: boolean
  highlight?: boolean
  translations: Partial<Record<AppLocale, TranslationInput>>
}

function normalizeList(value?: string[] | null) {
  if (!value) return []
  return value.map((item) => item.trim()).filter(Boolean)
}

function normalizeTranslations(
  translations?: Partial<Record<string, TranslationInput>>,
): { locale: AppLocale; data: TranslationInput }[] {
  const entries: { locale: AppLocale; data: TranslationInput }[] = []

  for (const locale of routing.locales) {
    const raw = translations?.[locale]
    if (!raw?.name?.trim()) continue

    entries.push({
      locale,
      data: {
        name: raw.name.trim(),
        description: raw.description?.trim() || null,
        highlightLabel: raw.highlightLabel?.trim() || null,
        badges: normalizeList(raw.badges),
        features: normalizeList(raw.features),
      },
    })
  }

  return entries
}

function mapTranslations(records: MarketingPlanTranslation[]): Partial<Record<AppLocale, TranslationInput>> {
  return records.reduce((acc, record) => {
    if (routing.locales.includes(record.locale as AppLocale)) {
      const locale = record.locale as AppLocale
      acc[locale] = {
        name: record.name,
        description: record.description ?? undefined,
        highlightLabel: record.highlightLabel ?? undefined,
        badges: record.badges ?? [],
        features: record.features ?? [],
      }
    }
    return acc
  }, {} as Partial<Record<AppLocale, TranslationInput>>)
}

function toAdminPayload(entry: MarketingPlan & { translations: MarketingPlanTranslation[] }): MarketingPlanAdminPayload {
  return {
    id: entry.id,
    tier: entry.tier,
    order: entry.order,
    isPublished: entry.isPublished,
    highlight: entry.highlight,
    translations: mapTranslations(entry.translations),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  }
}

function pickTranslation(
  translations: MarketingPlanTranslation[],
  locale: AppLocale,
): MarketingPlanTranslation | undefined {
  const fallbackOrder = [
    locale,
    "en",
    routing.defaultLocale,
  ]

  for (const candidate of fallbackOrder) {
    const found = translations.find((item) => item.locale === candidate)
    if (found) return found
  }

  return translations[0]
}

async function assertTierAvailable(tier: GymPlanTier, excludeId?: string) {
  const existing = await prisma.marketingPlan.findUnique({ where: { tier }, select: { id: true } })
  if (existing && existing.id !== excludeId) {
    const error = new Error("TIER_TAKEN")
    error.name = "TIER_TAKEN"
    throw error
  }
}

export async function listMarketingPlansForAdmin(): Promise<MarketingPlanAdminPayload[]> {
  const plans = await prisma.marketingPlan.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: { translations: true },
  })

  return plans.map(toAdminPayload)
}

export async function getPublishedMarketingPlans(locale: AppLocale): Promise<MarketingPlanPublicPayload[]> {
  const plans = await prisma.marketingPlan.findMany({
    where: { isPublished: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: { translations: true },
  })

  return plans.map((plan) => {
    const translation = pickTranslation(plan.translations, locale)
    return {
      id: plan.id,
      tier: plan.tier,
      order: plan.order,
      highlight: plan.highlight,
      highlightLabel: translation?.highlightLabel ?? undefined,
      name: translation?.name ?? plan.tier,
      description: translation?.description ?? undefined,
      badges: translation?.badges ?? [],
      features: translation?.features ?? [],
    }
  })
}

export async function createMarketingPlan(input: MarketingPlanInput) {
  if (!input.tier) {
    const error = new Error("MISSING_TIER")
    error.name = "MISSING_TIER"
    throw error
  }

  const translations = normalizeTranslations(input.translations)
  if (!translations.length) {
    const error = new Error("MISSING_TRANSLATION")
    error.name = "MISSING_TRANSLATION"
    throw error
  }

  await assertTierAvailable(input.tier)

  const created = await prisma.marketingPlan.create({
    data: {
      tier: input.tier,
      order: typeof input.order === "number" ? input.order : 0,
      isPublished: Boolean(input.isPublished),
      highlight: Boolean(input.highlight),
      translations: {
        create: translations.map((entry) => ({
          locale: entry.locale,
          name: entry.data.name,
          description: entry.data.description,
          highlightLabel: entry.data.highlightLabel,
          badges: entry.data.badges ?? [],
          features: entry.data.features ?? [],
        })),
      },
    },
    include: { translations: true },
  })

  return toAdminPayload(created)
}

export async function updateMarketingPlan(id: string, input: MarketingPlanInput) {
  const base = await prisma.marketingPlan.findUnique({
    where: { id },
    select: { id: true, tier: true, translations: { select: { locale: true, name: true } } },
  })

  if (!base) {
    const error = new Error("NOT_FOUND")
    error.name = "NOT_FOUND"
    throw error
  }

  const translations = normalizeTranslations(input.translations)
  const hasTranslations = translations.length > 0 || base.translations.length > 0
  if (!hasTranslations) {
    const error = new Error("MISSING_TRANSLATION")
    error.name = "MISSING_TRANSLATION"
    throw error
  }

  const nextTier = input.tier ?? base.tier
  if (nextTier !== base.tier) {
    await assertTierAvailable(nextTier, id)
  }

  await prisma.marketingPlan.update({
    where: { id },
    data: {
      tier: nextTier,
      order: typeof input.order === "number" ? input.order : undefined,
      isPublished: typeof input.isPublished === "boolean" ? input.isPublished : undefined,
      highlight: typeof input.highlight === "boolean" ? input.highlight : undefined,
    },
  })

  for (const translation of translations) {
    await prisma.marketingPlanTranslation.upsert({
      where: { planId_locale: { planId: id, locale: translation.locale } },
      update: {
        name: translation.data.name,
        description: translation.data.description,
        highlightLabel: translation.data.highlightLabel,
        badges: translation.data.badges ?? [],
        features: translation.data.features ?? [],
      },
      create: {
        planId: id,
        locale: translation.locale,
        name: translation.data.name,
        description: translation.data.description,
        highlightLabel: translation.data.highlightLabel,
        badges: translation.data.badges ?? [],
        features: translation.data.features ?? [],
      },
    })
  }

  const updated = await prisma.marketingPlan.findUnique({
    where: { id },
    include: { translations: true },
  })

  return updated ? toAdminPayload(updated) : null
}

export async function deleteMarketingPlan(id: string) {
  try {
    return await prisma.marketingPlan.delete({ where: { id } })
  } catch (error) {
    if ((error as any)?.code === "P2025") {
      const notFound = new Error("NOT_FOUND")
      notFound.name = "NOT_FOUND"
      throw notFound
    }
    throw error
  }
}
