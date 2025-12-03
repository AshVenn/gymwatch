import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { AccessEventSource } from "@prisma/client"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { hasPlanFeature } from "@/lib/subscription-plans"
import { markVisitForMember } from "@/lib/visits"
import { resolveAccessEventStatus } from "@/lib/access-events"

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const gymId = (session?.user as any)?.gymId as string | undefined
  const role = (session?.user as any)?.role as string | undefined
  const gymVariantId = (session?.user as any)?.gymVariantId as string | undefined
  const tier = (session?.user as any)?.subscriptionPlan ?? null

  if (!gymId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!hasPlanFeature(tier, "accessControl")) {
    return NextResponse.json({ error: "Plan Pro ou Complex requis" }, { status: 403 })
  }

  const { token, markVisit = true } = await request.json()

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token manquant" }, { status: 400 })
  }

  const member = await prisma.member.findFirst({
    where: {
      qrToken: token,
      gymId,
      ...(role === "GYM_ADMIN" && gymVariantId ? { gymVariantId } : {}),
    },
    select: { id: true, gymVariantId: true },
  })

  if (!member) {
    return NextResponse.json({ error: "Membre introuvable" }, { status: 404 })
  }

  const visit = await markVisitForMember({
    gymId,
    memberId: member.id,
    markVisit,
    allowedVariantId: role === "GYM_ADMIN" ? gymVariantId : undefined,
  })

  try {
    const status = resolveAccessEventStatus(visit)
    await prisma.accessEvent.create({
      data: {
        memberId: member.id,
        status,
        source: AccessEventSource.QR_SCAN,
      },
    })
  } catch (error) {
    console.error("[access-event][qr-verify]", error)
  }

  return NextResponse.json({
    member: {
      id: visit.memberId,
      firstName: visit.firstName,
      lastName: visit.lastName,
      planName: visit.planName,
      subscriptionEndsAt: visit.subscriptionEndsAt,
    },
    status: visit.status,
    active: visit.active,
    daysRemaining: visit.daysRemaining,
    alreadyVisited: visit.alreadyVisited,
    todayVisitorCount: visit.todayVisitorCount,
  })
}
