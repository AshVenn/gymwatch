import type { SubscriptionStatus } from "@prisma/client"
import { prisma } from "./prisma"
import { computeSubscriptionStatus, daysUntilExpiry } from "./subscription-status"

const startOfDay = (value: Date) => {
  const day = new Date(value)
  day.setHours(0, 0, 0, 0)
  return day
}

const isSameDay = (left: Date | null | undefined, right: Date) => {
  if (!left) return false
  return startOfDay(left).getTime() === startOfDay(right).getTime()
}

export type VisitResult = {
  memberId: string
  firstName: string
  lastName: string
  memberName: string
  planName: string | null
  subscriptionEndsAt: Date | null
  status: SubscriptionStatus
  active: boolean
  alreadyVisited: boolean
  daysRemaining: number | null
  todayVisitorCount: number
}

async function syncGymVisitorCounter(gymId: string, today: Date) {
  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: { id: true, todayVisitorCount: true, todayVisitorDate: true },
  })

  if (!gym) {
    throw new Error("Gym not found")
  }

  if (isSameDay(gym.todayVisitorDate, today)) {
    return gym
  }

  return prisma.gym.update({
    where: { id: gymId },
    data: {
      todayVisitorCount: 0,
      todayVisitorDate: today,
    },
    select: { id: true, todayVisitorCount: true, todayVisitorDate: true },
  })
}

export async function markVisitForMember({
  gymId,
  memberId,
  markVisit = true,
  allowedVariantId,
}: {
  gymId: string
  memberId: string
  markVisit?: boolean
  allowedVariantId?: string
}): Promise<VisitResult> {
  const now = new Date()
  const today = startOfDay(now)

  const [gym, member] = await Promise.all([
    syncGymVisitorCounter(gymId, today),
    prisma.member.findFirst({
      where: { id: memberId, gymId },
      include: {
        subscriptions: {
          where: { gymId },
          orderBy: { endDate: "desc" },
          take: 1,
          include: { plan: true },
        },
      },
    }),
  ])

  if (!member) {
    throw new Error("Member not found")
  }

  if (allowedVariantId && member.gymVariantId !== allowedVariantId) {
    throw new Error("FORBIDDEN_VARIANT")
  }

  const latestSubscription = member.subscriptions[0] ?? null
  const status = latestSubscription
    ? computeSubscriptionStatus(latestSubscription.endDate)
    : "EXPIRED"
  const daysRemaining = latestSubscription
    ? daysUntilExpiry(latestSubscription.endDate)
    : null
  const hasStarted =
    latestSubscription?.startDate instanceof Date
      ? latestSubscription.startDate.getTime() <= now.getTime()
      : false
  const isActive =
    latestSubscription !== null &&
    hasStarted &&
    (status === "ACTIVE" || status === "EXPIRES_TODAY")

  if (latestSubscription && latestSubscription.status !== status) {
    await prisma.subscription.update({
      where: { id: latestSubscription.id },
      data: { status },
    })
  }

  const alreadyVisited = isSameDay(member.lastVisitedAt, today)

  if (!markVisit || !isActive || alreadyVisited) {
    return {
      memberId: member.id,
      firstName: member.firstName,
      lastName: member.lastName,
      memberName: `${member.firstName} ${member.lastName}`.trim(),
      planName: latestSubscription?.plan?.name ?? null,
      subscriptionEndsAt: latestSubscription?.endDate ?? null,
      status,
      active: isActive,
      alreadyVisited,
      daysRemaining,
      todayVisitorCount: gym.todayVisitorCount,
    }
  }

  const [, updatedGym] = await prisma.$transaction([
    prisma.member.update({
      where: { id: member.id },
      data: { lastVisitedAt: now },
    }),
    prisma.gym.update({
      where: { id: gymId },
      data: {
        todayVisitorCount: { increment: 1 },
        todayVisitorDate: today,
      },
      select: { todayVisitorCount: true },
    }),
  ])

  return {
    memberId: member.id,
    firstName: member.firstName,
    lastName: member.lastName,
    memberName: `${member.firstName} ${member.lastName}`.trim(),
    planName: latestSubscription?.plan?.name ?? null,
    subscriptionEndsAt: latestSubscription?.endDate ?? null,
    status,
    active: isActive,
    alreadyVisited: false,
    daysRemaining,
    todayVisitorCount: updatedGym.todayVisitorCount,
  }
}
