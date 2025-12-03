import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { ClassBookingStatus } from "@prisma/client"
import { authOptions } from "@/lib/auth-middleware"
import { prisma } from "@/lib/prisma"
import { hasPlanFeature } from "@/lib/subscription-plans"
import { syncClassWaitlist } from "@/lib/class-sessions"

export async function DELETE(_request: NextRequest, { params }: { params: { classId: string; bookingId: string } }) {
  const auth = await getServerSession(authOptions)
  const gymId = auth?.user?.gymId as string | undefined
  const role = (auth?.user as any)?.role as string | undefined
  const sessionVariantId = (auth?.user as any)?.gymVariantId as string | undefined
  const tier = (auth?.user as any)?.subscriptionPlan ?? null

  if (!gymId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!hasPlanFeature(tier, "courses")) {
    return NextResponse.json({ error: "Plan Complex requis" }, { status: 403 })
  }

  const booking = await prisma.classBooking.findFirst({
    where: { id: params.bookingId, classSessionId: params.classId },
    include: {
      classSession: { select: { id: true, gymId: true, gymVariantId: true, capacity: true } },
    },
  })

  if (!booking || booking.classSession.gymId !== gymId) {
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
