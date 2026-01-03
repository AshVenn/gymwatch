import { NextResponse } from "next/server"

import { getPlanFeatures } from "@/lib/subscription-plans"
import { resolveGymFeatures } from "@/lib/tenant-features"
import { requireGymScope, requirePermission, requireSession } from "@/lib/auth/guards"
import { Permissions } from "@/lib/rbac/permissions"

export async function GET() {
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.GymMembersRead)
  if (!permission.ok) return permission.response

  const scope = requireGymScope(sessionResult.user)
  if (!scope.ok) return scope.response

  const tier = sessionResult.user.subscriptionPlan ?? null

  try {
    const { features, overrides } = await resolveGymFeatures({ gymId: scope.gymId, tier })

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
