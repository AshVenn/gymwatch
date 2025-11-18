import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { hasPlanFeature } from "@/lib/subscription-plans"
import { computeSubscriptionStatus } from "@/lib/subscription-status"

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  const gymId = (session?.user as any)?.gymId as string | undefined
  const tier = (session?.user as any)?.subscriptionPlan ?? null

  if (!gymId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!hasPlanFeature(tier, "qrTools")) {
    return NextResponse.json({ error: "Plan PRO requis" }, { status: 403 })
  }

  const { token } = await request.json()

  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Token manquant" }, { status: 400 })
  }

  const member = await prisma.member.findFirst({
    where: { qrToken: token, gymId },
    include: {
      subscriptions: {
        where: { gymId },
        orderBy: { endDate: "desc" },
        take: 1,
        include: { plan: true },
      },
    },
  })

  if (!member) {
    return NextResponse.json({ error: "Membre introuvable" }, { status: 404 })
  }

  const latestSubscription = member.subscriptions[0] ?? null
  const now = new Date()
  const status = latestSubscription
    ? computeSubscriptionStatus(latestSubscription.endDate)
    : "EXPIRED"
  const isActive =
    latestSubscription !== null &&
    (status === "ACTIVE" || (status === "EXPIRES_TODAY" && latestSubscription.endDate >= now))

  return NextResponse.json({
    member: {
      id: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      planName: latestSubscription?.plan?.name ?? null,
      subscriptionEndsAt: latestSubscription?.endDate ?? null,
    },
    status,
    active: isActive,
  })
}
