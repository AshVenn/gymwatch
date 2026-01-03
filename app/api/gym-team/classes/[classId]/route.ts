import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ClassBookingStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { resolveGymFeatures } from "@/lib/tenant-features"
import { syncClassWaitlist } from "@/lib/class-sessions"
import { jsonError, requireGymScope, requirePermission, requireSession } from "@/lib/auth/guards"
import { Permissions } from "@/lib/rbac/permissions"

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

type ClassIdParams = { params: Promise<{ classId: string }> }

export async function GET(_request: NextRequest, { params }: ClassIdParams) {
  const { classId } = await params
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.GymVisitsManage)
  if (!permission.ok) return permission.response

  const scope = requireGymScope(sessionResult.user)
  if (!scope.ok) return scope.response

  const role = (sessionResult.user as any)?.role as string | undefined
  const sessionVariantId = sessionResult.user.gymVariantId ?? undefined
  const tier = sessionResult.user.subscriptionPlan ?? null

  const { features } = await resolveGymFeatures({ gymId: scope.gymId, tier })
  if (!features.courses) {
    return jsonError(403, "COURSES_REQUIRED", "Plan Enterprise requis")
  }
  if (role === "GYM_ADMIN" && !sessionVariantId) {
    return jsonError(403, "MISSING_VARIANT", "Variant manquant")
  }

  const classSession = await prisma.classSession.findFirst({
    where: { id: classId, gymId: scope.gymId },
    include: {
      gymVariant: { select: { id: true, name: true, slug: true, isDefault: true } },
      bookings: {
        include: {
          member: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        },
      },
    },
  })

  if (!classSession) {
    return NextResponse.json({ error: "Cours introuvable" }, { status: 404 })
  }
  if (role === "GYM_ADMIN" && sessionVariantId && classSession.gymVariantId !== sessionVariantId) {
    return NextResponse.json({ error: "Variante non autorisee" }, { status: 403 })
  }

  const confirmedCount = classSession.bookings.filter((booking) => booking.status === ClassBookingStatus.CONFIRMED).length
  const waitlistCount = classSession.bookings.filter((booking) => booking.status === ClassBookingStatus.WAITLISTED).length

  return NextResponse.json({
    id: classSession.id,
    title: classSession.title,
    coach: classSession.coach,
    room: classSession.room,
    capacity: classSession.capacity,
    startAt: classSession.startAt,
    endAt: classSession.endAt,
    waitlist: classSession.waitlist,
    gymVariantId: classSession.gymVariantId,
    gymVariant: classSession.gymVariant,
    confirmedCount,
    waitlistCount,
    bookings: classSession.bookings.map((booking) => ({
      id: booking.id,
      status: booking.status,
      position: booking.position,
      createdAt: booking.createdAt,
      member: booking.member,
    })),
  })
}

export async function PUT(request: NextRequest, { params }: ClassIdParams) {
  const { classId } = await params
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.GymVisitsManage)
  if (!permission.ok) return permission.response

  const scope = requireGymScope(sessionResult.user)
  if (!scope.ok) return scope.response

  const role = (sessionResult.user as any)?.role as string | undefined
  const sessionVariantId = sessionResult.user.gymVariantId ?? undefined
  const tier = sessionResult.user.subscriptionPlan ?? null

  const { features } = await resolveGymFeatures({ gymId: scope.gymId, tier })
  if (!features.courses) {
    return jsonError(403, "COURSES_REQUIRED", "Plan Enterprise requis")
  }
  if (role === "GYM_ADMIN" && !sessionVariantId) {
    return jsonError(403, "MISSING_VARIANT", "Variant manquant")
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

  const classSession = await prisma.classSession.findFirst({
    where: { id: classId, gymId: scope.gymId },
    select: { id: true, gymVariantId: true },
  })

  if (!classSession) {
    return NextResponse.json({ error: "Cours introuvable" }, { status: 404 })
  }
  if (role === "GYM_ADMIN" && sessionVariantId && classSession.gymVariantId !== sessionVariantId) {
    return NextResponse.json({ error: "Variante non autorisee" }, { status: 403 })
  }

  const targetVariantId = payload.gymVariantId ?? classSession.gymVariantId
  const variant = await prisma.gymVariant.findFirst({
    where: { id: targetVariantId, gymId: scope.gymId },
    select: { id: true },
  })

  if (!variant) {
    return NextResponse.json({ error: "Variante invalide" }, { status: 400 })
  }
  if (role === "GYM_ADMIN" && sessionVariantId && variant.id !== sessionVariantId) {
    return NextResponse.json({ error: "Variante non autorisee" }, { status: 403 })
  }

  try {
    const updated = await prisma.classSession.update({
      where: { id: classId },
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

    await syncClassWaitlist(updated.id, updated.capacity)

    return NextResponse.json(updated)
  } catch (error) {
    console.error("[classes][put]", error)
    return NextResponse.json({ error: "Impossible de mettre a jour le cours" }, { status: 500 })
  }
}

export async function DELETE(_request: NextRequest, { params }: ClassIdParams) {
  const { classId } = await params
  const sessionResult = await requireSession()
  if (!sessionResult.ok) return sessionResult.response

  const permission = requirePermission(sessionResult.user, Permissions.GymVisitsManage)
  if (!permission.ok) return permission.response

  const scope = requireGymScope(sessionResult.user)
  if (!scope.ok) return scope.response

  const role = (sessionResult.user as any)?.role as string | undefined
  const sessionVariantId = sessionResult.user.gymVariantId ?? undefined
  const tier = sessionResult.user.subscriptionPlan ?? null

  const { features } = await resolveGymFeatures({ gymId: scope.gymId, tier })
  if (!features.courses) {
    return jsonError(403, "COURSES_REQUIRED", "Plan Enterprise requis")
  }
  if (role === "GYM_ADMIN" && !sessionVariantId) {
    return jsonError(403, "MISSING_VARIANT", "Variant manquant")
  }

  const classSession = await prisma.classSession.findFirst({
    where: { id: classId, gymId: scope.gymId },
    select: { id: true, gymVariantId: true },
  })

  if (!classSession) {
    return NextResponse.json({ error: "Cours introuvable" }, { status: 404 })
  }
  if (role === "GYM_ADMIN" && sessionVariantId && classSession.gymVariantId !== sessionVariantId) {
    return NextResponse.json({ error: "Variante non autorisee" }, { status: 403 })
  }

  try {
    await prisma.classSession.delete({
      where: { id: classId },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[classes][delete]", error)
    return NextResponse.json({ error: "Impossible de supprimer le cours" }, { status: 500 })
  }
}
