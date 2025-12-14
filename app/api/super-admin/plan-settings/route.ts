import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"

import { authOptions } from "@/lib/auth-middleware"
import { getPlanSettings, updatePlanSettings } from "@/lib/plan-settings"

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

async function assertSuperAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }
  return null
}

export async function GET() {
  const authError = await assertSuperAdmin()
  if (authError) return authError

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
  const authError = await assertSuperAdmin()
  if (authError) return authError

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
      return NextResponse.json({ error: "Invalid payload", details: error.flatten() }, { status: 422 })
    }

    return NextResponse.json({ error: "Unable to update plan settings" }, { status: 500 })
  }
}
