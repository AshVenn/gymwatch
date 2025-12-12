import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { daysUntilExpiry } from "@/lib/subscription-status"
import { resolveVariantAccess } from "@/lib/variant-access"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    const gymId = (session?.user as any)?.gymId as string | undefined
    const role = (session?.user as any)?.role as string | undefined
    const sessionVariantId = (session?.user as any)?.gymVariantId as string | undefined
    const tier = (session?.user as any)?.subscriptionPlan ?? null

    if (!gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (role === "GYM_ADMIN" && !sessionVariantId) {
      return NextResponse.json({ error: "Variant manquant" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const requestedVariantId = searchParams.get("variantId")
    const variantAccess = await resolveVariantAccess({
      gymId,
      tier,
      role,
      requestedVariantId,
      sessionVariantId,
    })

    if (!variantAccess.ok) {
      return NextResponse.json(
        {
          error: variantAccess.message,
          code: variantAccess.code,
          variantMode: variantAccess.variantMode,
          defaultVariantId: variantAccess.defaultVariantId,
          multiLocationAllowed: variantAccess.multiLocationAllowed,
        },
        { status: variantAccess.status },
      )
    }

    const gymVariantId = variantAccess.variantId

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)

    const revenueVisible = role !== "GYM_ADMIN"
    let monthlyRevenue = 0
    let percentageChange = 0
    const revenueByMonth: { month: string; revenue: number }[] = []

    if (revenueVisible) {
      const currentAgg = await prisma.payment.aggregate({
        where: {
          gymId,
          paymentDate: { gte: firstDayOfMonth, lte: lastDayOfMonth },
          ...(gymVariantId
            ? {
                subscriptions: {
                  some: { gymVariantId },
                },
              }
            : {}),
        },
        _sum: { amount: true },
      })

      const lastAgg = await prisma.payment.aggregate({
        where: {
          gymId,
          paymentDate: { gte: firstDayOfLastMonth, lte: lastDayOfLastMonth },
          ...(gymVariantId
            ? {
                subscriptions: {
                  some: { gymVariantId },
                },
              }
            : {}),
        },
        _sum: { amount: true },
      })

      monthlyRevenue = currentAgg._sum.amount ?? 0
      const lastMonthAmount = lastAgg._sum.amount ?? 0

      percentageChange =
        lastMonthAmount > 0
          ? Math.round(((monthlyRevenue - lastMonthAmount) / lastMonthAmount) * 100)
          : 0

      for (let i = 11; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1)

        const start = new Date(date.getFullYear(), date.getMonth(), 1)
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)

        const agg = await prisma.payment.aggregate({
          where: {
            gymId,
            paymentDate: { gte: start, lte: end },
            ...(gymVariantId
              ? {
                  subscriptions: {
                    some: { gymVariantId },
                  },
                }
              : {}),
          },
          _sum: { amount: true },
        })

        revenueByMonth.push({
          month: date.toLocaleDateString("fr-FR", { month: "short" }),
          revenue: agg._sum.amount ?? 0,
        })
      }
    }

    const activeMembers = await prisma.subscription.count({
      where: {
        gymId,
        ...(gymVariantId ? { gymVariantId } : {}),
        status: { in: ["ACTIVE", "EXPIRES_TODAY"] },
      },
    })

    const newMembers = await prisma.member.count({
      where: {
        gymId,
        ...(gymVariantId ? { gymVariantId } : {}),
        createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
      },
    })

    const plans = await prisma.membershipPlan.findMany({
      where: {
        gymId,
        ...(gymVariantId ? { gymVariantId } : {}),
      },
    })

    const planDistribution = await Promise.all(
      plans.map(async (plan: { id: string; name: string }) => {
        const count = await prisma.subscription.count({
        where: { planId: plan.id, status: "ACTIVE" },
      })

      return {
        name: plan.name,
        value: count ?? 0,
        }
      }),
    )

    const expiringSoonDate = new Date(today)
    expiringSoonDate.setDate(expiringSoonDate.getDate() + 7)

    const expiringSubs = await prisma.subscription.findMany({
      where: {
        gymId,
        ...(gymVariantId ? { gymVariantId } : {}),
        endDate: { gt: today, lte: expiringSoonDate },
        status: { in: ["ACTIVE", "EXPIRES_TODAY"] },
      },
      include: { member: true },
      orderBy: { endDate: "asc" },
      take: 10,
    })

    const expiringSoon = expiringSubs.map((sub) => ({
      id: sub.id,
      memberName: `${sub.member?.firstName ?? ""} ${sub.member?.lastName ?? ""}`.trim(),
      endDate: sub.endDate.toLocaleDateString("fr-FR"),
      daysLeft: daysUntilExpiry(sub.endDate),
    }))

    const visitorCounter = await prisma.gym.findUnique({
      where: { id: gymId },
      select: { todayVisitorCount: true, todayVisitorDate: true },
    })

    let todayVisitorCount = visitorCounter?.todayVisitorCount ?? 0
    if (visitorCounter) {
      const storedDate = visitorCounter.todayVisitorDate
        ? new Date(visitorCounter.todayVisitorDate)
        : null
      if (!storedDate || storedDate.setHours(0, 0, 0, 0) !== today.getTime()) {
        const updated = await prisma.gym.update({
          where: { id: gymId },
          data: { todayVisitorCount: 0, todayVisitorDate: today },
          select: { todayVisitorCount: true },
        })
        todayVisitorCount = updated.todayVisitorCount
      }
    }

    return NextResponse.json({
      monthlyRevenue,
      activeMembers: activeMembers ?? 0,
      newMembers: newMembers ?? 0,
      percentageChange,
      revenueByMonth,
      planDistribution: planDistribution ?? [],
      expiringSoon: expiringSoon ?? [],
      todayVisitorCount,
      canViewRevenue: revenueVisible,
      gymVariantId: gymVariantId ?? null,
      variantScope: {
        variantId: gymVariantId ?? null,
        variantMode: variantAccess.variantMode,
        multiLocationAllowed: variantAccess.multiLocationAllowed,
      },
    })
  } catch (error) {
    console.error("Stats error:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    )
  }
}
