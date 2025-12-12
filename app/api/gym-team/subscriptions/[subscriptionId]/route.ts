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
    const role = (session?.user as any)?.role as string | undefined
    const sessionVariantId = (session?.user as any)?.gymVariantId as string | undefined

    if (!gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (role === "GYM_ADMIN" && !sessionVariantId) {
      return NextResponse.json({ error: "Variant manquant" }, { status: 403 })
    }

    const { planId, startDate, endDate, createPayment = true } = await request.json()

    const subscription = await prisma.subscription.findFirst({
      where: { id: params.subscriptionId, gymId },
      select: { id: true, gymVariantId: true, memberId: true },
    })

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }
    if (role === "GYM_ADMIN" && sessionVariantId && subscription.gymVariantId !== sessionVariantId) {
      return NextResponse.json({ error: "FORBIDDEN_VARIANT" }, { status: 403 })
    }

    const plan = await prisma.membershipPlan.findUnique({
      where: { id: planId },
    })

    if (!plan || plan.gymId !== gymId) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    if (plan.gymVariantId !== subscription.gymVariantId) {
      return NextResponse.json({ error: "Plan incompatible avec cette variante" }, { status: 400 })
    }

    const start = new Date(startDate)
    const end = endDate ? new Date(endDate) : new Date(start)
    if (!endDate) {
      end.setDate(end.getDate() + plan.durationDays)
    }

    const status = computeSubscriptionStatus(end)

    const updatedSubscription = await prisma.subscription.update({
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

    return NextResponse.json({ subscription: updatedSubscription, payment })
  } catch (error) {
    console.error("Update subscription error:", error)
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: any) {
  try {
    const session = await getServerSession(authOptions)
    const gymId = (session?.user as any)?.gymId as string | undefined
    const role = (session?.user as any)?.role as string | undefined
    const sessionVariantId = (session?.user as any)?.gymVariantId as string | undefined

    if (!gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (role === "GYM_ADMIN" && !sessionVariantId) {
      return NextResponse.json({ error: "Variant manquant" }, { status: 403 })
    }

    const subscription = await prisma.subscription.findFirst({
      where: { id: params.subscriptionId, gymId },
      select: { id: true, gymVariantId: true },
    })

    if (!subscription) {
      return NextResponse.json({ error: "Subscription not found" }, { status: 404 })
    }
    if (role === "GYM_ADMIN" && sessionVariantId && subscription.gymVariantId !== sessionVariantId) {
      return NextResponse.json({ error: "FORBIDDEN_VARIANT" }, { status: 403 })
    }

    await prisma.subscription.delete({
      where: { id: params.subscriptionId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete subscription error:", error)
    return NextResponse.json({ error: "Failed to delete subscription" }, { status: 500 })
  }
}
