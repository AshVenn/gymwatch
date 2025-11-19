import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // 🔹 Get session with NextAuth v4
    const session = await getServerSession(authOptions)

    const gymId = (session?.user as any)?.gymId as string | undefined

    if (!gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0)

    // -------------------------
    // 🔹 Monthly Revenue
    // -------------------------
    const currentAgg = await prisma.payment.aggregate({
      where: {
        gymId,
        paymentDate: { gte: firstDayOfMonth, lte: lastDayOfMonth },
      },
      _sum: { amount: true },
    })

    const lastAgg = await prisma.payment.aggregate({
      where: {
        gymId,
        paymentDate: { gte: firstDayOfLastMonth, lte: lastDayOfLastMonth },
      },
      _sum: { amount: true },
    })

    const monthlyRevenue = currentAgg._sum.amount ?? 0
    const lastMonthAmount = lastAgg._sum.amount ?? 0

    const percentageChange =
      lastMonthAmount > 0
        ? Math.round(((monthlyRevenue - lastMonthAmount) / lastMonthAmount) * 100)
        : 0

    // -------------------------
    // 🔹 Active Members
    // -------------------------
    const activeMembers = await prisma.subscription.count({
      where: { gymId, status: "ACTIVE" },
    })

    // -------------------------
    // 🔹 New Members This Month
    // -------------------------
    const newMembers = await prisma.member.count({
      where: {
        gymId,
        createdAt: { gte: firstDayOfMonth, lte: lastDayOfMonth },
      },
    })

    // -------------------------
    // 🔹 Revenue by Month (12 months)
    // -------------------------
    const revenueByMonth: { month: string; revenue: number }[] = []

    for (let i = 11; i >= 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1)

      const start = new Date(date.getFullYear(), date.getMonth(), 1)
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0)

      const agg = await prisma.payment.aggregate({
        where: {
          gymId,
          paymentDate: { gte: start, lte: end },
        },
        _sum: { amount: true },
      })

      revenueByMonth.push({
        month: date.toLocaleDateString("fr-FR", { month: "short" }),
        revenue: agg._sum.amount ?? 0,
      })
    }

    // -------------------------
    // 🔹 Plan Distribution
    // -------------------------
    const plans = await prisma.membershipPlan.findMany({ where: { gymId } })

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

    // -------------------------
    // 🔹 Expiring Soon (7 days)
    // -------------------------
    const expiringSoonDate = new Date(today)
    expiringSoonDate.setDate(expiringSoonDate.getDate() + 7)

    const expiringSubs = await prisma.subscription.findMany({
      where: {
        gymId,
        endDate: { gt: today, lte: expiringSoonDate },
        status: { in: ["ACTIVE", "EXPIRES_TODAY"] },
      },
      include: { member: true },
      orderBy: { endDate: "asc" },
      take: 10,
    })

    const expiringSoon = expiringSubs.map((sub) => {
      const daysLeft = Math.ceil(
        (sub.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      )

      return {
        id: sub.id,
        memberName: `${sub.member?.firstName ?? ""} ${sub.member?.lastName ?? ""}`.trim(),
        endDate: sub.endDate.toLocaleDateString("fr-FR"),
        daysLeft: daysLeft ?? 0,
      }
    })

    return NextResponse.json({
      monthlyRevenue: monthlyRevenue ?? 0,
      activeMembers: activeMembers ?? 0,
      newMembers: newMembers ?? 0,
      percentageChange: percentageChange ?? 0,
      revenueByMonth: revenueByMonth ?? [],
      planDistribution: planDistribution ?? [],
      expiringSoon: expiringSoon ?? [],
    })
  } catch (error) {
    console.error("Stats error:", error)
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 },
    )
  }
}
