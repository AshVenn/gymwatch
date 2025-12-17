import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z, ZodError } from "zod"
import { revalidatePath } from "next/cache"

import { authOptions } from "@/lib/auth-middleware"
import { createPartnerClub, listPartnerClubsForAdmin } from "@/lib/partners"
import { routing } from "@/i18n/routing"

const translationSchema = z.object({
  name: z.string().min(2).optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  tagline: z.string().optional(),
  description: z.string().optional(),
})

const translationsSchema = z.object({
  fr: translationSchema.optional(),
  en: translationSchema.optional(),
  ar: translationSchema.optional(),
})

const partnerSchema = z.object({
  slug: z.string().min(2).max(120).optional(),
  websiteUrl: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  logoUrl: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  logoPublicId: z.string().optional().or(z.literal("").transform(() => undefined)),
  coverUrl: z.string().url().optional().or(z.literal("").transform(() => undefined)),
  coverPublicId: z.string().optional().or(z.literal("").transform(() => undefined)),
  order: z.number().int().min(0).max(9999).optional(),
  isPublished: z.boolean().optional(),
  translations: translationsSchema,
})

async function ensureSuperAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return null
  }
  return session
}

function revalidatePartnersPage() {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}/clubs`)
  }
}

function hasAtLeastOneTranslation(translations?: Record<string, { name?: string } | undefined>) {
  return Object.values(translations || {}).some((value) => Boolean(value?.name?.trim()))
}

export async function GET() {
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const partners = await listPartnerClubsForAdmin()
    return NextResponse.json(partners)
  } catch (error) {
    console.error("[super-admin][partners][GET]", error)
    return NextResponse.json({ error: "Unable to list partner clubs" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const payload = partnerSchema.parse(await req.json())
    if (!hasAtLeastOneTranslation(payload.translations)) {
      return NextResponse.json({ error: "Missing translation" }, { status: 422 })
    }

    const created = await createPartnerClub({
      slug: payload.slug,
      websiteUrl: payload.websiteUrl,
      logoUrl: payload.logoUrl,
      logoPublicId: payload.logoPublicId,
      coverUrl: payload.coverUrl,
      coverPublicId: payload.coverPublicId,
      order: payload.order,
      isPublished: payload.isPublished,
      translations: payload.translations,
    })

    revalidatePartnersPage()

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 422 })
    }

    if (error instanceof Error) {
      if (error.name === "SLUG_TAKEN") {
        return NextResponse.json({ error: "Slug already exists" }, { status: 409 })
      }
      if (error.name === "MISSING_TRANSLATION") {
        return NextResponse.json({ error: "At least one translation is required" }, { status: 422 })
      }
    }

    console.error("[super-admin][partners][POST]", error)
    return NextResponse.json({ error: "Unable to create partner club" }, { status: 500 })
  }
}
