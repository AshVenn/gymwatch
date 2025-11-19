import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { authOptions } from "@/lib/auth-middleware"
import { db } from "@/lib/db"
import { prisma } from "@/lib/prisma"

const updateSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  phone: z.string().optional().or(z.literal("").transform(() => undefined)),
})

function resolveMemberId(raw: string | string[]) {
  return Array.isArray(raw) ? raw[0] : raw
}

export async function PUT(
  request: NextRequest,
  context: { params: { memberId: string | string[] } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const memberId = resolveMemberId(context.params.memberId)
    const payload = updateSchema.parse(await request.json())

    const member = await prisma.member.findFirst({
      where: { id: memberId, gymId: session.user.gymId },
    })

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    const updated = await db.updateMember(memberId, {
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
    })

    return NextResponse.json(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 })
    }
    console.error("members.put", error)
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: { memberId: string | string[] } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const memberId = resolveMemberId(context.params.memberId)

    const member = await prisma.member.findFirst({
      where: { id: memberId, gymId: session.user.gymId },
    })

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    const activeSubscriptions = await prisma.subscription.count({
      where: {
        memberId,
        status: { in: ["ACTIVE", "EXPIRES_TODAY"] },
      },
    })

    if (activeSubscriptions > 0) {
      return NextResponse.json(
        { error: "Ce membre possede encore des abonnements actifs" },
        { status: 409 }
      )
    }

    await db.deleteMember(memberId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("members.delete", error)
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 })
  }
}
