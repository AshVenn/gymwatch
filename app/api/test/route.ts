import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // 🔹 NextAuth v4: use getServerSession(authOptions)
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const gymId = (session.user as any).gymId as string | undefined

    if (!gymId) {
      return NextResponse.json(
        { error: "User has no gymId in session" },
        { status: 400 },
      )
    }

    // 🏋️‍♂️ Fetch Gym
    const gym = await prisma.gym.findUnique({
      where: { id: gymId },
    })

    // 👤 Members
    const members = await prisma.member.findMany({
      where: { gymId },
      orderBy: { createdAt: "asc" },
    })

    // 📦 Plans
    const plans = await prisma.membershipPlan.findMany({
      where: { gymId },
      orderBy: { createdAt: "asc" },
    })

    // 📝 Subscriptions
    const subscriptions = await prisma.subscription.findMany({
      where: { gymId },
      include: {
        member: true,
        plan: true,
      },
      orderBy: { startDate: "desc" },
    })

    // 💰 Payments
    const payments = await prisma.payment.findMany({
      where: { gymId },
      orderBy: { paymentDate: "desc" },
    })

    // 📊 Summary
    const summary = {
      gymId,
      gymExists: Boolean(gym),
      memberCount: members.length,
      planCount: plans.length,
      subscriptionCount: subscriptions.length,
      paymentCount: payments.length,
      missingData: {
        noMembers: members.length === 0,
        noPlans: plans.length === 0,
        noSubscriptions: subscriptions.length === 0,
        noPayments: payments.length === 0,
      },
    }

    return NextResponse.json({
      summary,
      gym,
      members,
      plans,
      subscriptions,
      payments,
    })
  } catch (error) {
    console.error("TEST ROUTE ERROR:", error)
    return NextResponse.json(
      { error: "Something broke", details: String(error) },
      { status: 500 },
    )
  }
}
