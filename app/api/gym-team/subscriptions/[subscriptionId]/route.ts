// app/api/subscriptions/[subscriptionId]/route.ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { computeSubscriptionStatus } from "@/lib/subscription-status"
import { jsonError, requireGymScope, requirePermission, requireSession } from "@/lib/auth/guards"
import { Permissions } from "@/lib/rbac/permissions"

export async function PUT(request: NextRequest, { params }: any) {
  try {
    const sessionResult = await requireSession()
    if (!sessionResult.ok) return sessionResult.response

    const permission = requirePermission(sessionResult.user, Permissions.GymSubscriptionsManage)
    if (!permission.ok) return permission.response

    const scope = requireGymScope(sessionResult.user)
    if (!scope.ok) return scope.response

    const role = sessionResult.user.role as string | undefined
    const sessionVariantId = sessionResult.user.gymVariantId ?? undefined
    if (role === "GYM_ADMIN" && !sessionVariantId) {
      return jsonError(403, "MISSING_VARIANT", "Variant manquant")
    }

    const { planId, startDate, endDate, createPayment = true } = await request.json()

    const subscription = await prisma.subscription.findFirst({
      where: { id: params.subscriptionId, gymId: scope.gymId },
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

    if (!plan || plan.gymId !== scope.gymId) {
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
            gymId: scope.gymId,
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
    const sessionResult = await requireSession()
    if (!sessionResult.ok) return sessionResult.response

    const permission = requirePermission(sessionResult.user, Permissions.GymSubscriptionsManage)
    if (!permission.ok) return permission.response

    const scope = requireGymScope(sessionResult.user)
    if (!scope.ok) return scope.response

    const role = sessionResult.user.role as string | undefined
    const sessionVariantId = sessionResult.user.gymVariantId ?? undefined
    if (role === "GYM_ADMIN" && !sessionVariantId) {
      return jsonError(403, "MISSING_VARIANT", "Variant manquant")
    }

    const subscription = await prisma.subscription.findFirst({
      where: { id: params.subscriptionId, gymId: scope.gymId },
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
