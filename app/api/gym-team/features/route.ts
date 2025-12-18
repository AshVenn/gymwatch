import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth-middleware"
import { getPlanFeatures } from "@/lib/subscription-plans"
import { resolveGymFeatures } from "@/lib/tenant-features"

export async function GET() {
  const session = await getServerSession(authOptions)
  const gymId = (session?.user as any)?.gymId as string | undefined
  const tier = (session?.user as any)?.subscriptionPlan ?? null

  if (!gymId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const { features, overrides } = await resolveGymFeatures({ gymId, tier })

    return NextResponse.json({
      tier,
      features,
      overrides,
      base: getPlanFeatures(tier),
    })
  } catch (error) {
    console.error("[features][get]", error)
    return NextResponse.json({ error: "Unable to resolve features" }, { status: 500 })
  }
}
