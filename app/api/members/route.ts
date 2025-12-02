import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth-middleware"
import { db } from "@/lib/db"
import { prisma } from "@/lib/prisma"
import { computeSubscriptionStatus } from "@/lib/subscription-status"

const createMemberSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().optional().or(z.literal("").transform(() => undefined)),
  planId: z.string().optional().nullable(),
  startDate: z.string().optional().nullable(),
  gymVariantId: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const role = (session.user as any).role as string | undefined
    const sessionVariantId = (session.user as any).gymVariantId as string | undefined
    const requestedVariantId = request.nextUrl.searchParams.get("variantId")
    if (role === "GYM_ADMIN" && !sessionVariantId) {
      return NextResponse.json({ error: "Variant manquant" }, { status: 403 })
    }

    let gymVariantId = role === "GYM_ADMIN" ? sessionVariantId : undefined
    if (role === "GYM_OWNER" && requestedVariantId && requestedVariantId !== "all") {
      const variant = await prisma.gymVariant.findFirst({
        where: { id: requestedVariantId, gymId: session.user.gymId },
        select: { id: true },
      })
      if (!variant) {
        return NextResponse.json({ error: "Variant invalide" }, { status: 400 })
      }
      gymVariantId = variant.id
    }

    const members = await db.getMembers(session.user.gymId, gymVariantId)
    return NextResponse.json(members)
  } catch {
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = createMemberSchema.parse(await request.json())
    const gymId = session.user.gymId
    const role = (session.user as any).role as string | undefined
    const sessionVariantId = (session.user as any).gymVariantId as string | undefined

    if (role === "GYM_ADMIN" && !sessionVariantId) {
      return NextResponse.json({ error: "Variant manquant" }, { status: 403 })
    }

    let targetVariantId = role === "GYM_ADMIN" ? sessionVariantId : payload.gymVariantId
    if (!targetVariantId) {
      const defaultVariant = await prisma.gymVariant.findFirst({
        where: { gymId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      })
      targetVariantId = defaultVariant?.id
    }

    if (!targetVariantId) {
      return NextResponse.json({ error: "Variant introuvable" }, { status: 400 })
    }

    const variant = await prisma.gymVariant.findFirst({
      where: { id: targetVariantId, gymId },
      select: { id: true },
    })

    if (!variant) {
      return NextResponse.json({ error: "Variant invalide" }, { status: 400 })
    }

    const member = await db.createMember({
      gymId,
      gymVariantId: variant.id,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
    })

    let subscription: Awaited<ReturnType<typeof prisma.subscription.create>> | null = null

    if (payload.planId || payload.startDate) {
      if (!payload.planId || !payload.startDate) {
        return NextResponse.json(
          { error: "Plan et date de debut requis pour creer un abonnement" },
          { status: 400 },
        )
      }

      const plan = await prisma.membershipPlan.findFirst({
        where: { id: payload.planId, gymId, gymVariantId: variant.id },
      })

      if (!plan) {
        return NextResponse.json({ error: "Plan introuvable" }, { status: 404 })
      }

      const start = new Date(payload.startDate)
      if (Number.isNaN(start.getTime())) {
        return NextResponse.json({ error: "Date de debut invalide" }, { status: 400 })
      }

      const end = new Date(start)
      end.setDate(end.getDate() + plan.durationDays)
      const status = computeSubscriptionStatus(end)

      subscription = await prisma.subscription.create({
        data: {
          memberId: member.id,
          gymId,
          gymVariantId: variant.id,
          planId: plan.id,
          startDate: start,
          endDate: end,
          pricePaid: plan.price,
          status,
        },
      })

      await prisma.payment.create({
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
    }

    return NextResponse.json(subscription ? { member, subscription } : member, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }
    console.error("members.post", error)
    return NextResponse.json({ error: "Failed to create member" }, { status: 500 })
  }
}
