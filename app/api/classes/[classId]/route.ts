import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { z } from "zod"
import { ClassBookingStatus } from "@prisma/client"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { hasPlanFeature } from "@/lib/subscription-plans"
import { syncClassWaitlist } from "@/lib/class-sessions"

const classSessionSchema = z.object({
  title: z.string().min(1),
  coach: z.string().optional().nullable(),
  room: z.string().optional().nullable(),
  capacity: z.coerce.number().int().min(1),
  startAt: z.string(),
  endAt: z.string(),
  gymVariantId: z.string().optional(),
  waitlist: z.boolean().optional(),
})

async function getClassDetail(classId: string, gymId: string) {
  const session = await prisma.classSession.findFirst({
    where: { id: classId, gymId },
    include: {
      gymVariant: { select: { id: true, name: true, slug: true } },
      bookings: {
        orderBy: [{ createdAt: "asc" }],
        include: {
          member: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        },
      },
    },
  })

  if (!session) return null

  const statusOrder: Record<ClassBookingStatus, number> = {
    CONFIRMED: 0,
    WAITLISTED: 1,
    CANCELLED: 2,
  }

  const bookings = [...session.bookings].sort((a, b) => {
    const byStatus = statusOrder[a.status] - statusOrder[b.status]
    if (byStatus !== 0) return byStatus
    return a.createdAt.getTime() - b.createdAt.getTime()
  })

  const confirmedCount = bookings.filter((booking) => booking.status === ClassBookingStatus.CONFIRMED).length
  const waitlistCount = bookings.filter((booking) => booking.status === ClassBookingStatus.WAITLISTED).length

  return { ...session, bookings, confirmedCount, waitlistCount }
}

export async function GET(_request: NextRequest, { params }: { params: { classId: string } }) {
  const auth = await getServerSession(authOptions)
  const gymId = auth?.user?.gymId as string | undefined
  const role = (auth?.user as any)?.role as string | undefined
  const sessionVariantId = (auth?.user as any)?.gymVariantId as string | undefined
  const tier = (auth?.user as any)?.subscriptionPlan ?? null

  if (!gymId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!hasPlanFeature(tier, "courses")) {
    return NextResponse.json({ error: "Plan Enterprise requis" }, { status: 403 })
  }

  const baseSession = await prisma.classSession.findFirst({
    where: { id: params.classId, gymId },
    select: { id: true, gymVariantId: true },
  })

  if (!baseSession) {
    return NextResponse.json({ error: "Cours introuvable" }, { status: 404 })
  }

  if (role === "GYM_ADMIN" && sessionVariantId && baseSession.gymVariantId !== sessionVariantId) {
    return NextResponse.json({ error: "Variante non autorisee" }, { status: 403 })
  }

  const detail = await getClassDetail(params.classId, gymId)
  if (!detail) {
    return NextResponse.json({ error: "Cours introuvable" }, { status: 404 })
  }

  return NextResponse.json(detail)
}

export async function PUT(request: NextRequest, { params }: { params: { classId: string } }) {
  const auth = await getServerSession(authOptions)
  const gymId = auth?.user?.gymId as string | undefined
  const role = (auth?.user as any)?.role as string | undefined
  const sessionVariantId = (auth?.user as any)?.gymVariantId as string | undefined
  const tier = (auth?.user as any)?.subscriptionPlan ?? null

  if (!gymId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!hasPlanFeature(tier, "courses")) {
    return NextResponse.json({ error: "Plan Enterprise requis" }, { status: 403 })
  }

  let payload: z.infer<typeof classSessionSchema>
  try {
    payload = classSessionSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: "Champs invalides" }, { status: 400 })
  }

  const startAt = new Date(payload.startAt)
  const endAt = new Date(payload.endAt)

  if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
    return NextResponse.json({ error: "Dates invalides" }, { status: 400 })
  }

  if (endAt.getTime() <= startAt.getTime()) {
    return NextResponse.json({ error: "L'heure de fin doit etre apres le debut" }, { status: 400 })
  }

  const existing = await prisma.classSession.findFirst({
    where: { id: params.classId, gymId },
    select: { id: true, gymVariantId: true },
  })

  if (!existing) {
    return NextResponse.json({ error: "Cours introuvable" }, { status: 404 })
  }

  if (role === "GYM_ADMIN" && sessionVariantId && existing.gymVariantId !== sessionVariantId) {
    return NextResponse.json({ error: "Variante non autorisee" }, { status: 403 })
  }

  const resolvedVariantId = role === "GYM_ADMIN" ? sessionVariantId : payload.gymVariantId || existing.gymVariantId

  if (!resolvedVariantId) {
    return NextResponse.json({ error: "Variante introuvable" }, { status: 400 })
  }

  const variant = await prisma.gymVariant.findFirst({
    where: { id: resolvedVariantId, gymId },
    select: { id: true },
  })

  if (!variant) {
    return NextResponse.json({ error: "Variante invalide" }, { status: 400 })
  }

  try {
    await prisma.classSession.update({
      where: { id: existing.id },
      data: {
        title: payload.title,
        coach: payload.coach ?? null,
        room: payload.room ?? null,
        capacity: payload.capacity,
        startAt,
        endAt,
        waitlist: payload.waitlist ?? true,
        gymVariantId: variant.id,
      },
    })

    await syncClassWaitlist(existing.id, payload.capacity)

    const detail = await getClassDetail(existing.id, gymId)
    return NextResponse.json(detail)
  } catch (error) {
    console.error("[classes][put]", error)
    return NextResponse.json({ error: "Mise a jour impossible" }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { classId: string } }) {
  const auth = await getServerSession(authOptions)
  const gymId = auth?.user?.gymId as string | undefined
  const role = (auth?.user as any)?.role as string | undefined
  const sessionVariantId = (auth?.user as any)?.gymVariantId as string | undefined
  const tier = (auth?.user as any)?.subscriptionPlan ?? null

  if (!gymId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!hasPlanFeature(tier, "courses")) {
    return NextResponse.json({ error: "Plan Enterprise requis" }, { status: 403 })
  }

  const existing = await prisma.classSession.findFirst({
    where: { id: params.classId, gymId },
    select: { id: true, gymVariantId: true },
  })

  if (!existing) {
    return NextResponse.json({ error: "Cours introuvable" }, { status: 404 })
  }

  if (role === "GYM_ADMIN" && sessionVariantId && existing.gymVariantId !== sessionVariantId) {
    return NextResponse.json({ error: "Variante non autorisee" }, { status: 403 })
  }

  try {
    await prisma.classSession.delete({ where: { id: existing.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[classes][delete]", error)
    return NextResponse.json({ error: "Suppression impossible" }, { status: 500 })
  }
}
