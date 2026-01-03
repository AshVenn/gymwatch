import { NextResponse } from "next/server"
import { z } from "zod"

import { getPlanSettings, updatePlanSettings } from "@/lib/plan-settings"
import { Permissions } from "@/lib/rbac/permissions"
import { requirePermission, requireSession } from "@/lib/auth/guards"
import { recordAudit } from "@/lib/audit"

const planSettingsSchema = z.object({
  basicMonthlyPrice: z.coerce.number().min(0),
  proMonthlyPrice: z.coerce.number().min(0),
  enterpriseMonthlyPrice: z.coerce.number().min(0),
  annualDiscountPercent: z.coerce.number().min(0).max(90),
  basicPlanLimitPerVariant: z.coerce.number().int().min(-1),
  basicPlanLimitPerNetwork: z.coerce.number().int().min(-1),
  proPlanLimitPerVariant: z.coerce.number().int().min(-1),
  proPlanLimitPerNetwork: z.coerce.number().int().min(-1),
  enterprisePlanLimitPerVariant: z.coerce.number().int().min(-1),
  enterprisePlanLimitPerNetwork: z.coerce.number().int().min(-1),
})

export async function GET() {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformPlansManage)
  if (!permission.ok) return permission.response

  const { settings, pricing, limits } = await getPlanSettings()

  return NextResponse.json({
    settings: {
      basicMonthlyPrice: settings.basicMonthlyPrice,
      proMonthlyPrice: settings.proMonthlyPrice,
      enterpriseMonthlyPrice: settings.enterpriseMonthlyPrice,
      annualDiscountPercent: settings.annualDiscountPercent,
      basicPlanLimitPerVariant: settings.basicPlanLimitPerVariant,
      basicPlanLimitPerNetwork: settings.basicPlanLimitPerNetwork,
      proPlanLimitPerVariant: settings.proPlanLimitPerVariant,
      proPlanLimitPerNetwork: settings.proPlanLimitPerNetwork,
      enterprisePlanLimitPerVariant: settings.enterprisePlanLimitPerVariant,
      enterprisePlanLimitPerNetwork: settings.enterprisePlanLimitPerNetwork,
      updatedAt: settings.updatedAt,
    },
    pricing,
    limits,
  })
}

export async function PUT(request: Request) {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformPlansManage)
  if (!permission.ok) return permission.response

  try {
    const payload = planSettingsSchema.parse(await request.json())
    const { settings, pricing, limits } = await updatePlanSettings(payload)

    await recordAudit({
      actor: sessionResult.session.user,
      action: "platform.plan-settings.update",
      targetType: "plan-settings",
      targetId: "default",
      metadata: { updatedFields: Object.keys(payload) },
      request,
    })

    return NextResponse.json({
      settings: {
        basicMonthlyPrice: settings.basicMonthlyPrice,
        proMonthlyPrice: settings.proMonthlyPrice,
        enterpriseMonthlyPrice: settings.enterpriseMonthlyPrice,
        annualDiscountPercent: settings.annualDiscountPercent,
        basicPlanLimitPerVariant: settings.basicPlanLimitPerVariant,
        basicPlanLimitPerNetwork: settings.basicPlanLimitPerNetwork,
        proPlanLimitPerVariant: settings.proPlanLimitPerVariant,
        proPlanLimitPerNetwork: settings.proPlanLimitPerNetwork,
        enterprisePlanLimitPerVariant: settings.enterprisePlanLimitPerVariant,
        enterprisePlanLimitPerNetwork: settings.enterprisePlanLimitPerNetwork,
        updatedAt: settings.updatedAt,
      },
      pricing,
      limits,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { code: "INVALID_PAYLOAD", message: "Invalid payload", details: error.flatten() },
        { status: 422 },
      )
    }

    return NextResponse.json(
      { code: "PLAN_SETTINGS_UPDATE_FAILED", message: "Unable to update plan settings" },
      { status: 500 },
    )
  }
}
