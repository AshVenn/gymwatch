// app/api/subscriptions/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { computeSubscriptionStatus, daysUntilExpiry } from "@/lib/subscription-status"

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search")?.toLowerCase() ?? ""
    const status = searchParams.get("status") as string | null
    const requestedVariantId = searchParams.get("variantId")

    let gymVariantId = role === "GYM_ADMIN" ? sessionVariantId : undefined
    if (role === "GYM_OWNER" && requestedVariantId && requestedVariantId !== "all") {
      const variant = await prisma.gymVariant.findFirst({
        where: { id: requestedVariantId, gymId },
        select: { id: true },
      })
      if (!variant) {
        return NextResponse.json({ error: "Variant invalide" }, { status: 400 })
      }
      gymVariantId = variant.id
    }

    const subscriptions = await prisma.subscription.findMany({
      where: {
        gymId,
        ...(gymVariantId ? { gymVariantId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        member: true,
        plan: true,
        gymVariant: { select: { id: true, name: true, slug: true } },
      },
      orderBy: {
        endDate: "asc",
      },
    })

    const filtered = await Promise.all(
      subscriptions
        .filter((sub) => {
          if (!search) return true
          const memberName = `${sub.member.firstName} ${sub.member.lastName}`.toLowerCase()
          const planName = sub.plan.name.toLowerCase()
          return memberName.includes(search) || planName.includes(search)
        })
        .map(async (sub) => {
          const computedStatus = computeSubscriptionStatus(sub.endDate)
          if (computedStatus !== sub.status) {
            await prisma.subscription.update({
              where: { id: sub.id },
              data: { status: computedStatus },
            })
          }

          const daysLeft = daysUntilExpiry(sub.endDate)

          return {
            id: sub.id,
            memberId: sub.member.id,
            memberName: `${sub.member.firstName} ${sub.member.lastName}`,
            planName: sub.plan.name,
            startDate: sub.startDate.toISOString().split("T")[0],
            endDate: sub.endDate.toISOString().split("T")[0],
            daysLeft,
            status: computedStatus,
            pricePaid: sub.pricePaid,
            gymVariantId: sub.gymVariantId,
            gymVariant: sub.gymVariant,
          }
        }),
    )

    return NextResponse.json(filtered)
  } catch (error) {
    console.error("Subscriptions error:", error)
    return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    const { memberId, planId, startDate } = await request.json()

    const member = await prisma.member.findFirst({
      where: { id: memberId, gymId },
      select: { id: true, gymVariantId: true, firstName: true, lastName: true },
    })

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }
    if (role === "GYM_ADMIN" && sessionVariantId && member.gymVariantId !== sessionVariantId) {
      return NextResponse.json({ error: "FORBIDDEN_VARIANT" }, { status: 403 })
    }

    const plan = await prisma.membershipPlan.findUnique({
      where: { id: planId },
      select: { id: true, durationDays: true, price: true, gymId: true, gymVariantId: true, name: true },
    })

    if (!plan || plan.gymId !== gymId) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    if (plan.gymVariantId !== member.gymVariantId) {
      return NextResponse.json({ error: "Plan incompatible avec la variante du membre" }, { status: 400 })
    }

    const start = new Date(startDate)
    const end = new Date(start)
    end.setDate(end.getDate() + plan.durationDays)

    const status = computeSubscriptionStatus(end)

    const subscription = await prisma.subscription.create({
      data: {
        memberId,
        gymId,
        gymVariantId: member.gymVariantId,
        planId,
        startDate: start,
        endDate: end,
        pricePaid: plan.price,
        status: status as any,
      },
    })

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
    return NextResponse.json({ error: "Failed to create subscription" }, { status: 500 })
  }
}
