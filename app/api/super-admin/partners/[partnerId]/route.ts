import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z, ZodError } from "zod"
import { revalidatePath } from "next/cache"

import { authOptions } from "@/lib/auth-middleware"
import { deletePartnerClub, updatePartnerClub } from "@/lib/partners"
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
  translations: translationsSchema.optional(),
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
  if (!translations) return true
  return Object.values(translations).some((value) => Boolean(value?.name?.trim()))
}

export async function PATCH(
  req: Request,
  { params }: { params: { partnerId: string } },
) {
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const payload = partnerSchema.parse(await req.json())
    if (!hasAtLeastOneTranslation(payload.translations)) {
      return NextResponse.json({ error: "Missing translation" }, { status: 422 })
    }

    const updated = await updatePartnerClub(params.partnerId, {
      slug: payload.slug,
      websiteUrl: payload.websiteUrl,
      logoUrl: payload.logoUrl,
      logoPublicId: payload.logoPublicId,
      coverUrl: payload.coverUrl,
      coverPublicId: payload.coverPublicId,
      order: payload.order,
      isPublished: payload.isPublished,
      translations: payload.translations ?? {},
    })

    revalidatePartnersPage()

    return NextResponse.json(updated)
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
      if (error.name === "NOT_FOUND") {
        return NextResponse.json({ error: "Partner club not found" }, { status: 404 })
      }
    }

    console.error("[super-admin][partners][PATCH]", error)
    return NextResponse.json({ error: "Unable to update partner club" }, { status: 500 })
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { partnerId: string } },
) {
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    await deletePartnerClub(params.partnerId)
    revalidatePartnersPage()
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.name === "NOT_FOUND") {
      return NextResponse.json({ error: "Partner club not found" }, { status: 404 })
    }
    console.error("[super-admin][partners][DELETE]", error)
    return NextResponse.json({ error: "Unable to delete partner club" }, { status: 500 })
  }
}
