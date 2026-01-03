import { NextResponse } from "next/server"
import { z, ZodError } from "zod"
import { revalidatePath } from "next/cache"

import { createMarketingPlan, listMarketingPlansForAdmin } from "@/lib/marketing-plans"
import { routing } from "@/i18n/routing"
import { Permissions } from "@/lib/rbac/permissions"
import { requirePermission, requireSession } from "@/lib/auth/guards"
import { recordAudit } from "@/lib/audit"

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
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformMarketingManage)
  if (!permission.ok) return permission.response

  try {
    const plans = await listMarketingPlansForAdmin()
    return NextResponse.json(plans)
  } catch (error) {
    console.error("[super-admin][marketing-plans][GET]", error)
    return NextResponse.json(
      { code: "MARKETING_PLANS_LIST_FAILED", message: "Unable to list marketing plans" },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformMarketingManage)
  if (!permission.ok) return permission.response

  try {
    const payload = planSchema.parse(await req.json())
    if (!payload.tier) {
      return NextResponse.json(
        { code: "MISSING_TIER", message: "Missing plan tier" },
        { status: 422 },
      )
    }
    if (!hasAtLeastOneTranslation(payload.translations)) {
      return NextResponse.json(
        { code: "MISSING_TRANSLATION", message: "Missing translation" },
        { status: 422 },
      )
    }

    const created = await createMarketingPlan({
      tier: payload.tier,
      order: payload.order,
      isPublished: payload.isPublished,
      highlight: payload.highlight,
      translations: payload.translations,
    })

    revalidatePlanPages()

    await recordAudit({
      actor: sessionResult.session.user,
      action: "platform.marketing-plan.create",
      targetType: "marketing-plan",
      targetId: created.id,
      metadata: { tier: created.tier, isPublished: created.isPublished, highlight: created.highlight },
      request: req,
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { code: "INVALID_PAYLOAD", message: "Invalid payload", details: error.flatten() },
        { status: 422 },
      )
    }

    if (error instanceof Error) {
      if (error.name === "TIER_TAKEN") {
        return NextResponse.json(
          { code: "TIER_TAKEN", message: "Plan tier already exists" },
          { status: 409 },
        )
      }
      if (error.name === "MISSING_TRANSLATION") {
        return NextResponse.json(
          { code: "MISSING_TRANSLATION", message: "At least one translation is required" },
          { status: 422 },
        )
      }
      if (error.name === "MISSING_TIER") {
        return NextResponse.json(
          { code: "MISSING_TIER", message: "Plan tier is required" },
          { status: 422 },
        )
      }
    }

    console.error("[super-admin][marketing-plans][POST]", error)
    return NextResponse.json(
      { code: "MARKETING_PLAN_CREATE_FAILED", message: "Unable to create marketing plan" },
      { status: 500 },
    )
  }
}
