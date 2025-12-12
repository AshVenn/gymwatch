//api/plans/route.ts
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-middleware"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { prisma } from "@/lib/prisma"
import { resolveGymPlanLimits } from "@/lib/plan-settings"

function normalizeVisitsPerDay(raw: unknown, defaultValue?: number) {
  if (raw === undefined || raw === null) {
    return defaultValue
  }
  const parsed = typeof raw === "string" ? Number(raw) : raw
  if (typeof parsed !== "number" || !Number.isFinite(parsed)) {
    throw new Error("VISITS_PER_DAY_INVALID")
  }
  const intValue = Math.trunc(parsed)
  if (intValue === -1) return -1
  if (intValue < 1) {
    throw new Error("VISITS_PER_DAY_INVALID")
  }
  return intValue
}

function normalizeSessionLimit(raw: unknown, { allowUndefined = false }: { allowUndefined?: boolean } = {}) {
  if (raw === undefined) {
    return allowUndefined ? undefined : null
  }
  if (raw === null || raw === "") {
    return null
  }
  const parsed = typeof raw === "string" ? Number(raw) : raw
  if (typeof parsed !== "number" || !Number.isFinite(parsed)) {
    throw new Error("SESSION_LIMIT_INVALID")
  }
  const intValue = Math.trunc(parsed)
  if (intValue <= 0) {
    throw new Error("SESSION_LIMIT_INVALID")
  }
  return intValue
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = (session.user as any).role as string | undefined
    const sessionVariantId = (session.user as any).gymVariantId as string | undefined
    const requestedVariantId = request.nextUrl.searchParams.get("variantId")

    if (role === "GYM_ADMIN" && !sessionVariantId) {
      return NextResponse.json({ error: "Variant manquant" }, { status: 403 })
    }

    let gymVariantId = role === "GYM_ADMIN" ? sessionVariantId : undefined
    if (role === "GYM_OWNER" && requestedVariantId && requestedVariantId !== "all") {
      const variant = await prisma.gymVariant.findFirst({
        where: { id: requestedVariantId, gymId: session.user.gymId as string },
        select: { id: true },
      })
      if (!variant) {
        return NextResponse.json({ error: "Variant invalide" }, { status: 400 })
      }
      gymVariantId = variant.id
    }

    const plans = await db.getPlans(session.user.gymId as string, gymVariantId)

    return NextResponse.json(plans)
  } catch {
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = await request.json()
    const { name, durationDays, price, gymVariantId: payloadVariantId, isActive } = payload
    let visitsPerDay: number
    let maxSessionMinutes: number | null
    try {
      visitsPerDay = normalizeVisitsPerDay(payload.visitsPerDay, 1) ?? 1
    } catch {
      return NextResponse.json({ error: "VISITS_PER_DAY_INVALID" }, { status: 400 })
    }
    try {
      maxSessionMinutes = normalizeSessionLimit(payload.maxSessionMinutes) ?? null
    } catch {
      return NextResponse.json({ error: "SESSION_LIMIT_INVALID" }, { status: 400 })
    }

    const role = (session.user as any).role as string | undefined
    const sessionVariantId = (session.user as any).gymVariantId as string | undefined

    if (role === "GYM_ADMIN" && !sessionVariantId) {
      return NextResponse.json({ error: "Variant manquant" }, { status: 403 })
    }

    let gymVariantId = role === "GYM_ADMIN" ? sessionVariantId : payloadVariantId
    if (!gymVariantId) {
      const defaultVariant = await prisma.gymVariant.findFirst({
        where: { gymId: session.user.gymId as string },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      })
      gymVariantId = defaultVariant?.id
    }

    if (!gymVariantId) {
      return NextResponse.json({ error: "Variant introuvable" }, { status: 400 })
    }

    const gym = await prisma.gym.findUnique({
      where: { id: session.user.gymId as string },
      select: { subscriptionPlan: true, planLimitPerVariant: true, planLimitPerNetwork: true },
    })
    if (!gym) {
      return NextResponse.json({ error: "Gym not found" }, { status: 404 })
    }

    const targetActive = isActive ?? true
    if (targetActive) {
      const limits = await resolveGymPlanLimits(gym.subscriptionPlan, {
        perVariant: gym.planLimitPerVariant,
        perNetwork: gym.planLimitPerNetwork,
      })

      const [variantActivePlans, networkActivePlans] = await Promise.all([
        prisma.membershipPlan.count({
          where: { gymId: session.user.gymId as string, gymVariantId, isActive: true },
        }),
        prisma.membershipPlan.count({
          where: { gymId: session.user.gymId as string, isActive: true },
        }),
      ])

      if (!limits.unlimitedPerVariant && variantActivePlans >= limits.perVariant!) {
        return NextResponse.json(
          {
            error: "PLAN_LIMIT_REACHED",
            message: `Limite atteinte: ${limits.perVariant} plan(s) actif(s) pour cette variante.`,
            limits,
            usage: { variantActivePlans, networkActivePlans },
          },
          { status: 409 },
        )
      }

      if (!limits.unlimitedPerNetwork && networkActivePlans >= limits.perNetwork!) {
        return NextResponse.json(
          {
            error: "PLAN_LIMIT_REACHED",
            message: `Limite reseau atteinte: ${limits.perNetwork} plan(s) actif(s) pour ce reseau.`,
            limits,
            usage: { variantActivePlans, networkActivePlans },
          },
          { status: 409 },
        )
      }
    }

    const plan = await db.createPlan({
      gymId: session.user.gymId as string,
      gymVariantId,
      name,
      durationDays,
      price,
      isActive: isActive ?? true,
      visitsPerDay,
      maxSessionMinutes,
    })

    return NextResponse.json(plan, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create plan" }, { status: 500 })
  }
}
