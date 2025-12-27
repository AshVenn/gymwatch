import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z, ZodError } from "zod"
import { revalidatePath } from "next/cache"

import { authOptions } from "@/lib/auth-middleware"
import { createMarketingPlan, listMarketingPlansForAdmin } from "@/lib/marketing-plans"
import { routing } from "@/i18n/routing"

const translationSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  highlightLabel: z.string().optional(),
  badges: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
})

const translationsSchema = z.object({
  fr: translationSchema.optional(),
  en: translationSchema.optional(),
  ar: translationSchema.optional(),
})

const planSchema = z.object({
  tier: z.enum(["BASIC", "PRO", "ENTERPRISE"]).optional(),
  order: z.number().int().min(0).max(9999).optional(),
  isPublished: z.boolean().optional(),
  highlight: z.boolean().optional(),
  translations: translationsSchema,
})

async function ensureSuperAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return null
  }
  return session
}

function revalidatePlanPages() {
  for (const locale of routing.locales) {
    revalidatePath(`/${locale}`)
    const plansPath = locale === "en" ? "/pricing" : "/plans"
    revalidatePath(`/${locale}${plansPath}`)
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
    const plans = await listMarketingPlansForAdmin()
    return NextResponse.json(plans)
  } catch (error) {
    console.error("[super-admin][marketing-plans][GET]", error)
    return NextResponse.json({ error: "Unable to list marketing plans" }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const payload = planSchema.parse(await req.json())
    if (!payload.tier) {
      return NextResponse.json({ error: "Missing plan tier" }, { status: 422 })
    }
    if (!hasAtLeastOneTranslation(payload.translations)) {
      return NextResponse.json({ error: "Missing translation" }, { status: 422 })
    }

    const created = await createMarketingPlan({
      tier: payload.tier,
      order: payload.order,
      isPublished: payload.isPublished,
      highlight: payload.highlight,
      translations: payload.translations,
    })

    revalidatePlanPages()

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 422 })
    }

    if (error instanceof Error) {
      if (error.name === "TIER_TAKEN") {
        return NextResponse.json({ error: "Plan tier already exists" }, { status: 409 })
      }
      if (error.name === "MISSING_TRANSLATION") {
        return NextResponse.json({ error: "At least one translation is required" }, { status: 422 })
      }
      if (error.name === "MISSING_TIER") {
        return NextResponse.json({ error: "Plan tier is required" }, { status: 422 })
      }
    }

    console.error("[super-admin][marketing-plans][POST]", error)
    return NextResponse.json({ error: "Unable to create marketing plan" }, { status: 500 })
  }
}
