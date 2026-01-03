import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ClassBookingStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { resolveGymFeatures } from "@/lib/tenant-features"
import { jsonError, requireGymScope, requirePermission, requireSession } from "@/lib/auth/guards"
import { Permissions } from "@/lib/rbac/permissions"

const bookingSchema = z.object({
  memberId: z.string().min(1),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> },
) {
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

  if (role === "GYM_ADMIN" && !sessionVariantId) {
    return jsonError(403, "MISSING_VARIANT", "Variant manquant")
  }

  const { features } = await resolveGymFeatures({ gymId: scope.gymId, tier })
  if (!features.courses) {
    return jsonError(403, "COURSES_REQUIRED", "Plan Enterprise requis")
  }

  let payload: z.infer<typeof bookingSchema>
  try {
    payload = bookingSchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: "memberId requis" }, { status: 400 })
  }

  const classSession = await prisma.classSession.findFirst({
    where: { id: classId, gymId: scope.gymId },
    select: { id: true, gymVariantId: true, capacity: true, waitlist: true },
  })

  if (!classSession) {
    return NextResponse.json({ error: "Cours introuvable" }, { status: 404 })
  }

  if (role === "GYM_ADMIN" && sessionVariantId && classSession.gymVariantId !== sessionVariantId) {
    return NextResponse.json({ error: "Variante non autorisee" }, { status: 403 })
  }

  const member = await prisma.member.findFirst({
    where: { id: payload.memberId, gymId: scope.gymId, gymVariantId: classSession.gymVariantId },
    select: { id: true, firstName: true, lastName: true },
  })

  if (!member) {
    return NextResponse.json({ error: "Membre introuvable pour cette variante" }, { status: 404 })
  }

  const existing = await prisma.classBooking.findUnique({
    where: {
      classSessionId_memberId: { classSessionId: classSession.id, memberId: member.id },
    },
  })

  if (existing && existing.status !== ClassBookingStatus.CANCELLED) {
    return NextResponse.json({ error: "Membre deja inscrit" }, { status: 409 })
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const confirmedCount = await tx.classBooking.count({
        where: { classSessionId: classSession.id, status: ClassBookingStatus.CONFIRMED },
      })
      const waitlistedCount = await tx.classBooking.count({
        where: { classSessionId: classSession.id, status: ClassBookingStatus.WAITLISTED },
      })

      const isFull = confirmedCount >= classSession.capacity
      const shouldWaitlist = isFull && classSession.waitlist

      if (isFull && !classSession.waitlist) {
        throw new Error("COURSE_FULL")
      }

      const status = shouldWaitlist ? ClassBookingStatus.WAITLISTED : ClassBookingStatus.CONFIRMED
      const position = shouldWaitlist ? waitlistedCount + 1 : 0

      const booking = existing
        ? await tx.classBooking.update({
            where: { id: existing.id },
            data: { status, position },
          })
        : await tx.classBooking.create({
            data: {
              classSessionId: classSession.id,
              memberId: member.id,
              status,
              position,
            },
          })

      return { booking, status, position }
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message === "COURSE_FULL") {
      return NextResponse.json({ error: "Cours complet" }, { status: 409 })
    }
    console.error("[classes][booking][post]", error)
    return NextResponse.json({ error: "Impossible de reserver ce cours" }, { status: 500 })
  }
}
