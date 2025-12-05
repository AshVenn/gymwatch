import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"

import { authOptions } from "@/lib/auth-middleware"
import { getPlanSettings, updatePlanSettings } from "@/lib/plan-settings"

const planSettingsSchema = z.object({
  basicMonthlyPrice: z.coerce.number().min(0),
  proMonthlyPrice: z.coerce.number().min(0),
  complexMonthlyPrice: z.coerce.number().min(0),
  annualDiscountPercent: z.coerce.number().min(0).max(90),
})

export async function GET() {
  const { settings, pricing } = await getPlanSettings()

  return NextResponse.json({
    settings: {
      basicMonthlyPrice: settings.basicMonthlyPrice,
      proMonthlyPrice: settings.proMonthlyPrice,
      complexMonthlyPrice: settings.complexMonthlyPrice,
      annualDiscountPercent: settings.annualDiscountPercent,
      updatedAt: settings.updatedAt,
    },
    pricing,
  })
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const payload = planSettingsSchema.parse(await request.json())
    const { settings, pricing } = await updatePlanSettings(payload)

    return NextResponse.json({
      settings: {
        basicMonthlyPrice: settings.basicMonthlyPrice,
        proMonthlyPrice: settings.proMonthlyPrice,
        complexMonthlyPrice: settings.complexMonthlyPrice,
        annualDiscountPercent: settings.annualDiscountPercent,
        updatedAt: settings.updatedAt,
      },
      pricing,
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten() },
        { status: 422 },
      )
    }

    return NextResponse.json(
      { error: "Unable to update plan settings" },
      { status: 500 },
    )
  }
}
