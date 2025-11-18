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
})

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const members = await db.getMembers(session.user.gymId)
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

    const member = await db.createMember({
      gymId,
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
        where: { id: payload.planId, gymId },
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
