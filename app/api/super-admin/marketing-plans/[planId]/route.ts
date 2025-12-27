import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z, ZodError } from "zod"
import { revalidatePath } from "next/cache"

import { authOptions } from "@/lib/auth-middleware"
import { deleteMarketingPlan, updateMarketingPlan } from "@/lib/marketing-plans"
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

export async function PATCH(req: Request, { params }: { params: { planId: string } }) {
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const payload = planSchema.parse(await req.json())
    const updated = await updateMarketingPlan(params.planId, payload)

    revalidatePlanPages()

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 422 })
    }

    if (error instanceof Error) {
      if (error.name === "NOT_FOUND") {
        return NextResponse.json({ error: "Plan not found" }, { status: 404 })
      }
      if (error.name === "TIER_TAKEN") {
        return NextResponse.json({ error: "Plan tier already exists" }, { status: 409 })
      }
      if (error.name === "MISSING_TRANSLATION") {
        return NextResponse.json({ error: "At least one translation is required" }, { status: 422 })
      }
    }

    console.error("[super-admin][marketing-plans][PATCH]", error)
    return NextResponse.json({ error: "Unable to update marketing plan" }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: { planId: string } }) {
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    await deleteMarketingPlan(params.planId)
    revalidatePlanPages()
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && error.name === "NOT_FOUND") {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }
    console.error("[super-admin][marketing-plans][DELETE]", error)
    return NextResponse.json({ error: "Unable to delete marketing plan" }, { status: 500 })
  }
}
