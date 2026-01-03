import { NextResponse } from "next/server"
import { z } from "zod"

import { getPlanSettings, updatePlanSettings } from "@/lib/plan-settings"
import { jsonError, requireGymScope, requirePermission, requireSession } from "@/lib/auth/guards"
import { Permissions } from "@/lib/rbac/permissions"

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

  const permission = requirePermission(sessionResult.user, Permissions.GymPlansManage)
  if (!permission.ok) return permission.response

  const scope = requireGymScope(sessionResult.user)
  if (!scope.ok) return scope.response

  const { limits } = await getPlanSettings()

  return NextResponse.json({ limits })
}

export async function PUT(request: Request) {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformPlansManage)
  if (!permission.ok) return permission.response

  try {
    const payload = planSettingsSchema.parse(await request.json())
    const { settings, pricing, limits } = await updatePlanSettings(payload)

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
      return jsonError(422, "INVALID_PAYLOAD", "Invalid payload", error.flatten())
    }

    return jsonError(500, "PLAN_SETTINGS_UPDATE_FAILED", "Unable to update plan settings")
  }
}
