import { NextRequest, NextResponse } from "next/server"
import { PlanFeatureFlag } from "@prisma/client"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { applyFeatureOverrides, getPlanFeatures } from "@/lib/subscription-plans"
import { resolveGymFeatures } from "@/lib/tenant-features"
import { Permissions } from "@/lib/rbac/permissions"
import { requirePermission, requireSession } from "@/lib/auth/guards"
import { recordAudit } from "@/lib/audit"

const payloadSchema = z.object({
  overrides: z.record(z.nativeEnum(PlanFeatureFlag), z.boolean().nullable()).default({}),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ gymId: string }> },
) {
  const { gymId } = await params
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.PlatformGymsWrite)
  if (!permission.ok) return permission.response

  if (!gymId) {
    return NextResponse.json(
      { code: "GYM_REQUIRED", message: "Gym requis" },
      { status: 400 },
    )
  }

  let parsed: z.infer<typeof payloadSchema>
  try {
    parsed = payloadSchema.parse(await request.json())
  } catch (error) {
    return NextResponse.json(
      { code: "INVALID_PAYLOAD", message: "Payload invalide" },
      { status: 400 },
    )
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const [feature, enabled] of Object.entries(parsed.overrides)) {
        if (enabled === null) {
          await tx.featureOverride.deleteMany({
            where: { gymId, feature: feature as PlanFeatureFlag },
          })
        } else {
          await tx.featureOverride.upsert({
            where: { gymId_feature: { gymId, feature: feature as PlanFeatureFlag } },
            update: { enabled },
            create: { gymId, feature: feature as PlanFeatureFlag, enabled },
          })
        }
      }
    })

    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
      select: { subscriptionPlan: true },
    })

    const { overrides, features } = await resolveGymFeatures({
      gymId,
      tier: gym?.subscriptionPlan ?? null,
    })

    await recordAudit({
      actor: sessionResult.session.user,
      action: "platform.gym.feature-overrides.update",
      targetType: "gym",
      targetId: gymId,
      metadata: {
        overrides: parsed.overrides,
      },
      request,
    })

    return NextResponse.json({
      overrides,
      features,
      tier: gym?.subscriptionPlan ?? null,
      base: getPlanFeatures(gym?.subscriptionPlan ?? null),
      applied: applyFeatureOverrides(getPlanFeatures(gym?.subscriptionPlan ?? null), overrides),
    })
  } catch (error) {
    console.error("[super-admin][feature-overrides][put]", error)
    return NextResponse.json(
      { code: "FEATURE_OVERRIDE_FAILED", message: "Mise a jour impossible" },
      { status: 500 },
    )
  }
}
