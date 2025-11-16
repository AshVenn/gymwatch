import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-middleware"
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { prisma } from "@/lib/prisma"
import { computeSubscriptionStatus } from "@/lib/subscription-status"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { firstName, lastName, email, phone, planId, startDate } = await request.json()

    // 1️⃣ Create Member
    const member = await db.createMember({
      gymId: session.user.gymId,
      firstName,
      lastName,
      email: email || null,
      phone: phone || null,
    })

    // 2️⃣ If no plan selected → return member only
    if (!planId || !startDate) {
      return NextResponse.json(member, { status: 201 })
    }

    // 3️⃣ Fetch plan
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

    // 4️⃣ Create subscription
    const subscription = await prisma.subscription.create({
      data: {
        memberId: member.id,
        gymId: session.user.gymId,
        planId,
        startDate: start,
        endDate: end,
        pricePaid: plan.price,
        status,
      },
    })

    // 5️⃣ Create payment
    const payment = await prisma.payment.create({
      data: {
        gymId: session.user.gymId,
        amount: plan.price,
        currency: "MAD",
        paymentDate: start,
        subscriptions: {
          connect: { id: subscription.id },
        },
      },
    })

    return NextResponse.json({ member, subscription, payment }, { status: 201 })

  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Failed to create member" },
      { status: 500 }
    )
  }
}
