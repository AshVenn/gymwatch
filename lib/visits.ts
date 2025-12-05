import type { Prisma, SubscriptionStatus } from "@prisma/client"
import { prisma } from "./prisma"
import { computeSubscriptionStatus, daysUntilExpiry } from "./subscription-status"

const startOfDay = (value: Date) => {
  const day = new Date(value)
  day.setHours(0, 0, 0, 0)
  return day
}

const endOfDay = (value: Date) => {
  const day = startOfDay(value)
  day.setHours(23, 59, 59, 999)
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

export type CheckoutResult = {
  visitId: string
  memberId: string
  memberName: string
  firstName: string
  lastName: string
  variantId: string
  variantName: string
  checkIn: Date
  checkOut: Date
  durationMinutes: number
}

export type VisitRow = {
  id: string
  memberId: string
  memberName: string
  variantId: string
  variantName: string
  checkIn: Date
  checkOut: Date | null
  durationMinutes: number
  isOverMaxDuration: boolean
}

export type VisitAnalytics = {
  visits: VisitRow[]
  summary: {
    total: number
    uniqueMembers: number
    currentInside: number
    averageDurationMinutes: number
  }
  charts: {
    byHour: Array<{ label: string; value: number }>
    byDay: Array<{ label: string; value: number }>
    byVariant: Array<{ label: string; value: number }>
  }
  range: {
    from: Date
    to: Date
    mode: "day" | "period"
  }
  maxSessionMinutes: number | null
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

  let alreadyVisited = isSameDay(member.lastVisitedAt, today)
  if (!alreadyVisited) {
    const existingVisit = await prisma.visit.findFirst({
      where: {
        memberId: member.id,
        checkIn: { gte: today, lte: endOfDay(today) },
      },
      select: { id: true },
    })
    alreadyVisited = Boolean(existingVisit)
  }

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
    prisma.visit.create({
      data: {
        gymId,
        memberId: member.id,
        gymVariantId: member.gymVariantId,
        checkIn: now,
      },
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

export async function markCheckoutForMember({
  gymId,
  memberId,
  visitId,
  checkoutAt,
  allowedVariantId,
  rangeFrom,
  rangeTo,
}: {
  gymId: string
  memberId?: string
  visitId?: string
  checkoutAt?: Date
  allowedVariantId?: string
  rangeFrom?: Date
  rangeTo?: Date
}): Promise<CheckoutResult> {
  const timeWindow: Prisma.DateTimeFilter | undefined =
    rangeFrom || rangeTo
      ? {
          ...(rangeFrom ? { gte: rangeFrom } : {}),
          ...(rangeTo ? { lte: rangeTo } : {}),
        }
      : undefined

  const baseWhere: Prisma.VisitWhereInput = {
    gymId,
    checkOut: null,
    ...(allowedVariantId ? { gymVariantId: allowedVariantId } : {}),
    ...(memberId ? { memberId } : {}),
    ...(timeWindow ? { checkIn: timeWindow } : {}),
  }

  const targetVisit = visitId
    ? await prisma.visit.findFirst({
        where: {
          ...baseWhere,
          id: visitId,
        },
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              gymVariant: { select: { id: true, name: true } },
            },
          },
        },
      })
    : await prisma.visit.findFirst({
        where: baseWhere,
        orderBy: { checkIn: "desc" },
        include: {
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              gymVariant: { select: { id: true, name: true } },
            },
          },
        },
      })

  if (!targetVisit) {
    throw new Error("OPEN_VISIT_NOT_FOUND")
  }

  if (memberId && targetVisit.memberId !== memberId) {
    throw new Error("FORBIDDEN_VISIT")
  }

  const resolvedCheckout = checkoutAt ?? new Date()
  const checkoutDate =
    resolvedCheckout.getTime() < targetVisit.checkIn.getTime()
      ? targetVisit.checkIn
      : resolvedCheckout

  const updatedVisit = await prisma.visit.update({
    where: { id: targetVisit.id },
    data: { checkOut: checkoutDate },
    include: {
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          gymVariant: { select: { id: true, name: true } },
        },
      },
    },
  })

  const durationMinutes = Math.max(
    0,
    Math.round((checkoutDate.getTime() - updatedVisit.checkIn.getTime()) / 60000),
  )

  const memberName = `${updatedVisit.member.firstName} ${updatedVisit.member.lastName}`.trim()

  return {
    visitId: updatedVisit.id,
    memberId: updatedVisit.memberId,
    memberName,
    firstName: updatedVisit.member.firstName,
    lastName: updatedVisit.member.lastName,
    variantId: updatedVisit.member.gymVariant?.id ?? updatedVisit.gymVariantId,
    variantName: updatedVisit.member.gymVariant?.name ?? "Salle",
    checkIn: updatedVisit.checkIn,
    checkOut: updatedVisit.checkOut ?? checkoutDate,
    durationMinutes,
  }
}

export async function getVisitAnalytics({
  gymId,
  variantId,
  view = "day",
  date,
  from,
  to,
  search,
  limit = 120,
  maxSessionMinutes,
}: {
  gymId: string
  variantId?: string | null
  view?: "day" | "period"
  date?: Date
  from?: Date
  to?: Date
  search?: string
  limit?: number
  maxSessionMinutes?: number | null
}): Promise<VisitAnalytics> {
  const now = new Date()
  const viewMode = view === "period" ? "period" : "day"
  const rangeStart =
    viewMode === "day"
      ? startOfDay(date ?? now)
      : startOfDay(from ?? new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000))
  const rangeEnd = viewMode === "day" ? endOfDay(date ?? now) : endOfDay(to ?? now)
  const safeLimit = Math.min(Math.max(Math.floor(limit ?? 120), 1), 500)
  const sessionLimit =
    typeof maxSessionMinutes === "number" && Number.isFinite(maxSessionMinutes) && maxSessionMinutes > 0
      ? Math.round(maxSessionMinutes)
      : null

  const where: Prisma.VisitWhereInput = {
    gymId,
    ...(variantId ? { gymVariantId: variantId } : {}),
    checkIn: { gte: rangeStart, lte: rangeEnd },
    ...(search
      ? {
          member: {
            OR: [
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
            ],
          },
        }
      : {}),
  }

  const [visits, totalVisits, distinctMembers, openVisits, chartVisits, variantGroups] = await Promise.all([
    prisma.visit.findMany({
      where,
      orderBy: { checkIn: "desc" },
      take: safeLimit,
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            gymVariant: { select: { id: true, name: true } },
          },
        },
      },
    }),
    prisma.visit.count({ where }),
    prisma.visit.findMany({
      where,
      select: { memberId: true },
      distinct: ["memberId"],
    }),
    prisma.visit.count({
      where: {
        gymId,
        ...(variantId ? { gymVariantId: variantId } : {}),
        checkOut: null,
        checkIn: { gte: startOfDay(now) },
      },
    }),
    prisma.visit.findMany({
      where,
      select: { checkIn: true, checkOut: true, gymVariantId: true },
    }),
    prisma.visit.groupBy({
      by: ["gymVariantId"],
      where,
      _count: { _all: true },
    }),
  ])

  const variantNames = await prisma.gymVariant.findMany({
    where: { id: { in: variantGroups.map((group) => group.gymVariantId) } },
    select: { id: true, name: true },
  })

  const durationSum = chartVisits.reduce((acc, visit) => {
    const end = visit.checkOut ?? now
    const duration = Math.max(0, Math.round((end.getTime() - visit.checkIn.getTime()) / 60000))
    return acc + duration
  }, 0)
  const averageDurationMinutes = chartVisits.length ? Math.round(durationSum / chartVisits.length) : 0

  const byVariant = variantGroups.map((group) => {
    const label = variantNames.find((variant) => variant.id === group.gymVariantId)?.name ?? "Variant"
    return { label, value: group._count._all }
  })

  const hourlyBuckets = Array.from({ length: 24 }, (_, hour) => ({
    label: `${hour.toString().padStart(2, "0")}h`,
    value: 0,
  }))

  chartVisits.forEach((visit) => {
    const hour = new Date(visit.checkIn).getHours()
    if (hourlyBuckets[hour]) {
      hourlyBuckets[hour].value += 1
    }
  })

  const dayCounts = new Map<string, number>()
  chartVisits.forEach((visit) => {
    const key = startOfDay(visit.checkIn).toISOString().slice(0, 10)
    dayCounts.set(key, (dayCounts.get(key) ?? 0) + 1)
  })

  const byDay: Array<{ label: string; value: number }> = []
  const cursor = new Date(rangeStart)
  let guard = 0
  while (cursor.getTime() <= rangeEnd.getTime() && guard < 200) {
    const key = startOfDay(cursor).toISOString().slice(0, 10)
    const label = cursor.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
    byDay.push({ label, value: dayCounts.get(key) ?? 0 })
    cursor.setDate(cursor.getDate() + 1)
    guard++
  }

  const rows: VisitRow[] = visits.map((visit) => {
    const memberName = `${visit.member.firstName} ${visit.member.lastName}`.trim()
    const end = visit.checkOut ?? now
    const durationMinutes = Math.max(0, Math.round((end.getTime() - visit.checkIn.getTime()) / 60000))
    const isOverMaxDuration = sessionLimit ? durationMinutes > sessionLimit : false
    return {
      id: visit.id,
      memberId: visit.memberId,
      memberName,
      variantId: visit.member.gymVariant?.id ?? visit.gymVariantId,
      variantName: visit.member.gymVariant?.name ?? "Salle",
      checkIn: visit.checkIn,
      checkOut: visit.checkOut,
      durationMinutes,
      isOverMaxDuration,
    }
  })

  return {
    visits: rows,
    summary: {
      total: totalVisits,
      uniqueMembers: distinctMembers.length,
      currentInside: openVisits,
      averageDurationMinutes,
    },
    charts: {
      byHour: hourlyBuckets,
      byDay,
      byVariant,
    },
    range: {
      from: rangeStart,
      to: rangeEnd,
      mode: viewMode,
    },
    maxSessionMinutes: sessionLimit,
  }
}
