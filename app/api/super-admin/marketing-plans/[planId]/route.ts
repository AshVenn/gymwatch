import { NextRequest, NextResponse } from "next/server"
import { z, ZodError } from "zod"
import { revalidatePath } from "next/cache"

import { deleteMarketingPlan, updateMarketingPlan } from "@/lib/marketing-plans"
import { routing } from "@/i18n/routing"
import { Permissions } from "@/lib/rbac/permissions"
import { requirePermission, requireSession } from "@/lib/auth/guards"
import { recordAudit } from "@/lib/audit"

const translationSchema = z.object({
  name: z.string().min(2),
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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformMarketingManage)
  if (!permission.ok) return permission.response

  try {
    const payload = planSchema.parse(await req.json())
    const updated = await updateMarketingPlan(planId, payload)
    if (!updated) {
      return NextResponse.json({ code: "NOT_FOUND", message: "Plan not found" }, { status: 404 })
    }

    revalidatePlanPages()

    await recordAudit({
      actor: sessionResult.session.user,
      action: "platform.marketing-plan.update",
      targetType: "marketing-plan",
      targetId: updated.id,
      metadata: { updatedFields: Object.keys(payload), isPublished: updated.isPublished },
      request: req,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { code: "INVALID_PAYLOAD", message: "Invalid payload", details: error.flatten() },
        { status: 422 },
      )
    }

    if (error instanceof Error) {
      if (error.name === "NOT_FOUND") {
        return NextResponse.json({ code: "NOT_FOUND", message: "Plan not found" }, { status: 404 })
      }
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
    }

    console.error("[super-admin][marketing-plans][PATCH]", error)
    return NextResponse.json(
      { code: "MARKETING_PLAN_UPDATE_FAILED", message: "Unable to update marketing plan" },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> },
) {
  const { planId } = await params
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformMarketingManage)
  if (!permission.ok) return permission.response

  try {
    await deleteMarketingPlan(planId)
    revalidatePlanPages()
    await recordAudit({
      actor: sessionResult.session.user,
      action: "platform.marketing-plan.delete",
      targetType: "marketing-plan",
      targetId: planId,
      request: _req,
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && error.name === "NOT_FOUND") {
      return NextResponse.json({ code: "NOT_FOUND", message: "Plan not found" }, { status: 404 })
    }
    console.error("[super-admin][marketing-plans][DELETE]", error)
    return NextResponse.json(
      { code: "MARKETING_PLAN_DELETE_FAILED", message: "Unable to delete marketing plan" },
      { status: 500 },
    )
  }
}
