import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { resolveGymPlanLimits } from "@/lib/plan-settings"
import { requireGymScope, requirePermission, requireSession } from "@/lib/auth/guards"
import { Permissions } from "@/lib/rbac/permissions"

export async function GET() {
  try {
    const sessionResult = await requireSession()
    if (!sessionResult.ok) return sessionResult.response

    const permission = requirePermission(sessionResult.user, Permissions.GymMembersRead)
    if (!permission.ok) return permission.response

    const scope = requireGymScope(sessionResult.user)
    if (!scope.ok) return scope.response

    const gym = await prisma.gym.findUnique({
      where: { id: scope.gymId },
    })

    if (!gym) {
      return NextResponse.json({ error: "Gym not found" }, { status: 404 })
    }

    const planLimits = await resolveGymPlanLimits(gym.subscriptionPlan, {
      perVariant: (gym as any).planLimitPerVariant,
      perNetwork: (gym as any).planLimitPerNetwork,
    })

    return NextResponse.json({ ...gym, planLimits })
  } catch (error) {
    console.error("Gym fetch failed", error)
    return NextResponse.json({ error: "Failed to fetch gym" }, { status: 500 })
  }
}

export async function PUT(_request: NextRequest) {
  try {
    const sessionResult = await requireSession()
    if (!sessionResult.ok) return sessionResult.response

    const permission = requirePermission(sessionResult.user, Permissions.GymMembersRead)
    if (!permission.ok) return permission.response

    const scope = requireGymScope(sessionResult.user)
    if (!scope.ok) return scope.response

    return NextResponse.json(
      {
        error:
          "Les parametres globaux sont en lecture seule pour votre compte. Contactez le support pour les modifier.",
      },
      { status: 403 },
    )
  } catch (error) {
    console.error("Gym update failed", error)
    return NextResponse.json({ error: "Failed to update gym" }, { status: 500 })
  }
}
