import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { PlanFeatureFlag } from "@prisma/client"
import { z } from "zod"

import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { applyFeatureOverrides, getPlanFeatures } from "@/lib/subscription-plans"
import { resolveGymFeatures } from "@/lib/tenant-features"

const payloadSchema = z.object({
  overrides: z.record(z.nativeEnum(PlanFeatureFlag), z.boolean().nullable()).default({}),
})

async function ensureSuperAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return null
  }
  return session
}

export async function PUT(request: Request, { params }: { params: { gymId: string } }) {
  const session = await ensureSuperAdmin()
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const gymId = params.gymId
  if (!gymId) {
    return NextResponse.json({ error: "Gym requis" }, { status: 400 })
  }

  let parsed: z.infer<typeof payloadSchema>
  try {
    parsed = payloadSchema.parse(await request.json())
  } catch (error) {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 })
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

    return NextResponse.json({
      overrides,
      features,
      tier: gym?.subscriptionPlan ?? null,
      base: getPlanFeatures(gym?.subscriptionPlan ?? null),
      applied: applyFeatureOverrides(getPlanFeatures(gym?.subscriptionPlan ?? null), overrides),
    })
  } catch (error) {
    console.error("[super-admin][feature-overrides][put]", error)
    return NextResponse.json({ error: "Mise a jour impossible" }, { status: 500 })
  }
}
