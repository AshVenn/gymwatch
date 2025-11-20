// app/api/subscriptions/[subscriptionId]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { computeSubscriptionStatus } from "@/lib/subscription-status"

export async function PUT(request: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions)
    const gymId = (session?.user as any)?.gymId as string | undefined

    if (!gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { planId, startDate, endDate, createPayment = true } = await request.json()

    const plan = await prisma.membershipPlan.findUnique({
      where: { id: planId },
    })

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    if (plan.gymId !== gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : new Date(start)
    if (!endDate) {
      end.setDate(end.getDate() + plan.durationDays)
    }

    const status = computeSubscriptionStatus(end)

    const subscription = await prisma.subscription.update({
      where: { id: params.subscriptionId },
      data: {
        planId,
        startDate: start,
        endDate: end,
        pricePaid: plan.price,
        status: status as any,
      },
    })

    const payment = createPayment
      ? await prisma.payment.create({
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
      : null

    return NextResponse.json({ subscription, payment })
  } catch (error) {
    console.error("Update subscription error:", error)
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions)
    const gymId = (session?.user as any)?.gymId as string | undefined

    if (!gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await prisma.subscription.delete({
      where: { id: params.subscriptionId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete subscription error:", error)
    return NextResponse.json(
      { error: "Failed to delete subscription" },
      { status: 500 },
    )
  }
}
