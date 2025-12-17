import type { PartnerClub, PartnerClubTranslation } from "@prisma/client"

import { routing, type AppLocale } from "@/i18n/routing"

import { prisma } from "./prisma"

type TranslationInput = {
  name: string
  city?: string | null
  country?: string | null
  tagline?: string | null
  description?: string | null
}

export type PartnerClubAdminPayload = {
  id: string
  slug: string
  websiteUrl?: string | null
  logoUrl?: string | null
  logoPublicId?: string | null
  coverUrl?: string | null
  coverPublicId?: string | null
  order: number
  isPublished: boolean
  translations: Partial<Record<AppLocale, TranslationInput>>
  createdAt: Date
  updatedAt: Date
}

export type PartnerClubPublicPayload = {
  id: string
  slug: string
  websiteUrl?: string | null
  logoUrl?: string | null
  coverUrl?: string | null
  name: string
  city?: string | null
  country?: string | null
  tagline?: string | null
  description?: string | null
  order: number
}

type PartnerInput = {
  slug?: string
  websiteUrl?: string | null
  logoUrl?: string | null
  logoPublicId?: string | null
  coverUrl?: string | null
  coverPublicId?: string | null
  order?: number
  isPublished?: boolean
  translations: Partial<Record<AppLocale, TranslationInput>>
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "") || "partner"
  )
}

function normalizeField(value?: string | null) {
  const trimmed = value?.trim() ?? ""
  return trimmed.length ? trimmed : null
}

function normalizeTranslations(
  translations?: Partial<Record<string, TranslationInput>>,
): { locale: AppLocale; data: TranslationInput }[] {
  const entries: { locale: AppLocale; data: TranslationInput }[] = []

  for (const locale of routing.locales) {
    const raw = translations?.[locale]
    if (!raw || !raw.name?.trim()) continue

    entries.push({
      locale,
      data: {
        name: raw.name.trim(),
        city: normalizeField(raw.city),
        country: normalizeField(raw.country),
        tagline: normalizeField(raw.tagline),
        description: normalizeField(raw.description),
      },
    })
  }

  return entries
}

function mapTranslations(records: PartnerClubTranslation[]): Partial<Record<AppLocale, TranslationInput>> {
  return records.reduce((acc, record) => {
    if (routing.locales.includes(record.locale as AppLocale)) {
      const locale = record.locale as AppLocale
      acc[locale] = {
        name: record.name,
        city: record.city ?? undefined,
        country: record.country ?? undefined,
        tagline: record.tagline ?? undefined,
        description: record.description ?? undefined,
      }
    }
    return acc
  }, {} as Partial<Record<AppLocale, TranslationInput>>)
}

function toAdminPayload(entry: PartnerClub & { translations: PartnerClubTranslation[] }): PartnerClubAdminPayload {
  return {
    id: entry.id,
    slug: entry.slug,
    websiteUrl: entry.websiteUrl ?? undefined,
    logoUrl: entry.logoUrl ?? undefined,
    logoPublicId: entry.logoPublicId ?? undefined,
    coverUrl: entry.coverUrl ?? undefined,
    coverPublicId: entry.coverPublicId ?? undefined,
    order: entry.order,
    isPublished: entry.isPublished,
    translations: mapTranslations(entry.translations),
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  }
}

function pickTranslation(
  translations: PartnerClubTranslation[],
  locale: AppLocale,
): PartnerClubTranslation | undefined {
  return (
    translations.find((t) => t.locale === locale) ||
    translations.find((t) => t.locale === routing.defaultLocale) ||
    translations[0]
  )
}

async function assertSlugAvailable(slug: string, excludeId?: string) {
  const existing = await prisma.partnerClub.findUnique({ where: { slug }, select: { id: true } })
  if (existing && existing.id !== excludeId) {
    const error = new Error("SLUG_TAKEN")
    error.name = "SLUG_TAKEN"
    throw error
  }
}

export async function listPartnerClubsForAdmin(): Promise<PartnerClubAdminPayload[]> {
  const partners = await prisma.partnerClub.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: { translations: true },
  })

  return partners.map(toAdminPayload)
}

export async function getPublishedPartnerClubs(locale: AppLocale): Promise<PartnerClubPublicPayload[]> {
  const partners = await prisma.partnerClub.findMany({
    where: { isPublished: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: { translations: true },
  })

  return partners.map((partner) => {
    const translation = pickTranslation(partner.translations, locale)
    return {
      id: partner.id,
      slug: partner.slug,
      websiteUrl: partner.websiteUrl ?? undefined,
      logoUrl: partner.logoUrl ?? undefined,
      coverUrl: partner.coverUrl ?? undefined,
      name: translation?.name ?? partner.slug,
      city: translation?.city ?? undefined,
      country: translation?.country ?? undefined,
      tagline: translation?.tagline ?? undefined,
      description: translation?.description ?? undefined,
      order: partner.order,
    }
  })
}

export async function createPartnerClub(input: PartnerInput) {
  const translations = normalizeTranslations(input.translations)
  if (!translations.length) {
    const error = new Error("MISSING_TRANSLATION")
    error.name = "MISSING_TRANSLATION"
    throw error
  }

  const fallbackName = translations[0].data.name
  const slug = slugify(input.slug || fallbackName)

  await assertSlugAvailable(slug)

  const created = await prisma.partnerClub.create({
    data: {
      slug,
      websiteUrl: normalizeField(input.websiteUrl),
      logoUrl: normalizeField(input.logoUrl),
      logoPublicId: normalizeField(input.logoPublicId),
      coverUrl: normalizeField(input.coverUrl),
      coverPublicId: normalizeField(input.coverPublicId),
      order: typeof input.order === "number" ? input.order : 0,
      isPublished: Boolean(input.isPublished),
      translations: {
        create: translations.map((t) => ({
          locale: t.locale,
          name: t.data.name,
          city: t.data.city,
          country: t.data.country,
          tagline: t.data.tagline,
          description: t.data.description,
        })),
      },
    },
    include: { translations: true },
  })

  return toAdminPayload(created)
}

export async function updatePartnerClub(id: string, input: PartnerInput) {
  const base = await prisma.partnerClub.findUnique({
    where: { id },
    select: { id: true, translations: { select: { locale: true, name: true } } },
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

  const fallbackName =
    translations[0]?.data.name || base.translations[0]?.name || input.slug || "partner"
  const nextSlug = slugify(input.slug || fallbackName)
  await assertSlugAvailable(nextSlug, id)

  await prisma.partnerClub.update({
    where: { id },
    data: {
      slug: nextSlug,
      websiteUrl: normalizeField(input.websiteUrl),
      logoUrl: normalizeField(input.logoUrl),
      logoPublicId: normalizeField(input.logoPublicId),
      coverUrl: normalizeField(input.coverUrl),
      coverPublicId: normalizeField(input.coverPublicId),
      order: typeof input.order === "number" ? input.order : undefined,
      isPublished: typeof input.isPublished === "boolean" ? input.isPublished : undefined,
    },
  })

  // Upsert translations if provided
  for (const translation of translations) {
    await prisma.partnerClubTranslation.upsert({
      where: { partnerId_locale: { partnerId: id, locale: translation.locale } },
      update: {
        name: translation.data.name,
        city: translation.data.city,
        country: translation.data.country,
        tagline: translation.data.tagline,
        description: translation.data.description,
      },
      create: {
        partnerId: id,
        locale: translation.locale,
        name: translation.data.name,
        city: translation.data.city,
        country: translation.data.country,
        tagline: translation.data.tagline,
        description: translation.data.description,
      },
    })
  }

  const updated = await prisma.partnerClub.findUnique({
    where: { id },
    include: { translations: true },
  })

  return updated ? toAdminPayload(updated) : null
}

export async function deletePartnerClub(id: string) {
  try {
    return await prisma.partnerClub.delete({
      where: { id },
    })
  } catch (error) {
    if ((error as any)?.code === "P2025") {
      const notFound = new Error("NOT_FOUND")
      notFound.name = "NOT_FOUND"
      throw notFound
    }
    throw error
  }
}
