// app/api/subscriptions/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { computeSubscriptionStatus } from "@/lib/subscription-status"

export async function GET(request: NextRequest) {
  try {
    // 🔹 NextAuth v4: get session using authOptions
    const session = await getServerSession(authOptions)
    const gymId = (session?.user as any)?.gymId as string | undefined

    if (!gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")?.toLowerCase() ?? ""
    const status = searchParams.get("status") as string | null

    const subscriptions = await prisma.subscription.findMany({
      where: {
        gymId,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        member: true,
        plan: true,
      },
      orderBy: {
        endDate: "asc",
      },
    })

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const filtered = subscriptions
      .filter((sub) => {
        if (!search) return true
        const memberName = `${sub.member.firstName} ${sub.member.lastName}`.toLowerCase()
        const planName = sub.plan.name.toLowerCase()
        return memberName.includes(search) || planName.includes(search)
      })
      .map((sub) => {
        const daysLeft = Math.ceil(
          (sub.endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
        )

        return {
          id: sub.id,
          memberName: `${sub.member.firstName} ${sub.member.lastName}`,
          planName: sub.plan.name,
          startDate: sub.startDate.toISOString().split("T")[0],
          endDate: sub.endDate.toISOString().split("T")[0],
          daysLeft,
          status: sub.status,
          pricePaid: sub.pricePaid,
        }
      })

    return NextResponse.json(filtered)
  } catch (error) {
    console.error("Subscriptions error:", error)
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const gymId = (session?.user as any)?.gymId as string | undefined

    if (!gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { memberId, planId, startDate } = await request.json()

    const plan = await prisma.membershipPlan.findUnique({
      where: { id: planId },
    })

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    const start = new Date(startDate)
    const end = new Date(start)
    end.setDate(end.getDate() + plan.durationDays)

    const status = computeSubscriptionStatus(end)

    // 1) Créer la subscription
    const subscription = await prisma.subscription.create({
      data: {
        memberId,
        gymId,
        planId,
        startDate: start,
        endDate: end,
        pricePaid: plan.price,
        status: status as any,
      },
    })

    // 2) Créer le paiement lié
    const payment = await prisma.payment.create({
      data: {
        gymId,
        amount: plan.price,
        currency: "MAD",
        paymentDate: start,
        subscriptions: {
          connect: { id: subscription.id },
        },
      },
    })

    return NextResponse.json({ subscription, payment }, { status: 201 })
  } catch (error) {
    console.error("Create subscription error:", error)
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 },
    )
  }
}
