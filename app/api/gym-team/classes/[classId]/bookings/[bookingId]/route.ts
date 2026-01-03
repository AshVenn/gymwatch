import { NextRequest, NextResponse } from "next/server"
import { ClassBookingStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { resolveGymFeatures } from "@/lib/tenant-features"
import { syncClassWaitlist } from "@/lib/class-sessions"
import { jsonError, requireGymScope, requirePermission, requireSession } from "@/lib/auth/guards"
import { Permissions } from "@/lib/rbac/permissions"

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ classId: string; bookingId: string }> },
) {
  const { classId, bookingId } = await params
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

  const booking = await prisma.classBooking.findFirst({
    where: { id: bookingId, classSessionId: classId },
    include: {
      classSession: { select: { id: true, gymId: true, gymVariantId: true, capacity: true } },
    },
  })

  if (!booking || booking.classSession.gymId !== scope.gymId) {
    return NextResponse.json({ error: "Reservation introuvable" }, { status: 404 })
  }

  if (role === "GYM_ADMIN" && sessionVariantId && booking.classSession.gymVariantId !== sessionVariantId) {
    return NextResponse.json({ error: "Variante non autorisee" }, { status: 403 })
  }

  try {
    await prisma.classBooking.update({
      where: { id: booking.id },
      data: { status: ClassBookingStatus.CANCELLED, position: 0 },
    })

    await syncClassWaitlist(booking.classSession.id, booking.classSession.capacity)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[classes][booking][delete]", error)
    return NextResponse.json({ error: "Impossible d'annuler la reservation" }, { status: 500 })
  }
}
