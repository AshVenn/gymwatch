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

export async function PUT(request: NextRequest, { params }: { params: { memberId: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const payload = updateSchema.parse(await request.json())

    const member = await prisma.member.findFirst({
      where: { id: params.memberId, gymId: session.user.gymId },
    })

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    const updated = await db.updateMember(params.memberId, {
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

export async function DELETE(_request: NextRequest, { params }: { params: { memberId: string } }) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.gymId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const member = await prisma.member.findFirst({
      where: { id: params.memberId, gymId: session.user.gymId },
    })

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    const activeSubscriptions = await prisma.subscription.count({
      where: {
        memberId: params.memberId,
        status: { in: ["ACTIVE", "EXPIRES_TODAY"] },
      },
    })

    if (activeSubscriptions > 0) {
      return NextResponse.json(
        { error: "Ce membre possede encore des abonnements actifs" },
        { status: 409 },
      )
    }

    await db.deleteMember(params.memberId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("members.delete", error)
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 })
  }
}
