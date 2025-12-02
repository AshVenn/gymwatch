//api/plans/route.ts
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-middleware"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { prisma } from "@/lib/prisma"

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

    const { name, durationDays, price, gymVariantId: payloadVariantId } = await request.json()

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

    const plan = await db.createPlan({
      gymId: session.user.gymId as string,
      gymVariantId,
      name,
      durationDays,
      price,
    })

    return NextResponse.json(plan, { status: 201 })
  } catch {
    return NextResponse.json({ error: "Failed to create plan" }, { status: 500 })
  }
}
