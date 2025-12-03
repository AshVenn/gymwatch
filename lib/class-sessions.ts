import { ClassBookingStatus } from "@prisma/client"
import { prisma } from "./prisma"

/**
 * Reorders the waitlist and promotes bookings to confirmed when seats are available.
 */
export async function syncClassWaitlist(classSessionId: string, capacityOverride?: number) {
  await prisma.$transaction(async (tx) => {
    const session = await tx.classSession.findUnique({
      where: { id: classSessionId },
      select: { capacity: true },
    })

    if (!session) {
      throw new Error("CLASS_NOT_FOUND")
    }

    const capacity = capacityOverride ?? session.capacity

    await tx.classBooking.updateMany({
      where: { classSessionId, status: ClassBookingStatus.CONFIRMED },
      data: { position: 0 },
    })

    const waitlisted = await tx.classBooking.findMany({
      where: { classSessionId, status: ClassBookingStatus.WAITLISTED },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    })

    const confirmedCount = await tx.classBooking.count({
      where: { classSessionId, status: ClassBookingStatus.CONFIRMED },
    })

    const available = Math.max(0, capacity - confirmedCount)
    const toPromote = waitlisted.slice(0, available)
    const remaining = waitlisted.slice(available)

    await Promise.all([
      ...toPromote.map((booking) =>
        tx.classBooking.update({
          where: { id: booking.id },
          data: { status: ClassBookingStatus.CONFIRMED, position: 0 },
        }),
      ),
      ...remaining.map((booking, idx) =>
        tx.classBooking.update({
          where: { id: booking.id },
          data: { status: ClassBookingStatus.WAITLISTED, position: idx + 1 },
        }),
      ),
    ])
  })
}
