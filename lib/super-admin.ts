import { GymSubscriptionPlan, GymSubscriptionStatus, UserRole } from "@prisma/client"
import { prisma } from "./prisma"
import { hashPassword } from "./auth"

function getMonthBoundaries(offset: number) {
  const reference = new Date()
  const start = new Date(reference.getFullYear(), reference.getMonth() - offset, 1)
  const end = new Date(reference.getFullYear(), reference.getMonth() - offset + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

async function ensurePreference(userId: string) {
  await prisma.userPreference.upsert({
    where: { userId },
    update: {},
    create: { userId },
  })
}

export async function getSuperAdminOverview() {
  const [gyms, totalMembers, activeSubscriptions] = await Promise.all([
    prisma.gym.findMany({
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        subscriptionPlan: true,
        subscriptionGracePeriodDays: true,
      },
    }),
    prisma.member.count(),
    prisma.subscription.count({
      where: { status: { in: ["ACTIVE", "EXPIRES_TODAY"] } },
    }),
  ])

  const currentMonth = getMonthBoundaries(0)
  const revenueAgg = await prisma.payment.aggregate({
    where: { paymentDate: { gte: currentMonth.start, lte: currentMonth.end } },
    _sum: { amount: true },
  })

  const totalGyms = gyms.length
  const activeGyms = gyms.filter((gym) => gym.subscriptionStatus === "ACTIVE").length
  const suspendedGyms = gyms.filter((gym) => gym.subscriptionStatus === "SUSPENDED").length

  const statusBreakdown = [
    { status: "ACTIVE", value: activeGyms },
    { status: "SUSPENDED", value: suspendedGyms },
    {
      status: "EXPIRED",
      value: gyms.filter((gym) => gym.subscriptionStatus === "EXPIRED").length,
    },
  ]

  const now = new Date()
  const expiringThreshold = new Date(now)
  expiringThreshold.setDate(expiringThreshold.getDate() + 10)
  const expiringGyms = gyms
    .filter(
      (gym) =>
        gym.subscriptionExpiresAt &&
        gym.subscriptionExpiresAt > now &&
        gym.subscriptionExpiresAt <= expiringThreshold,
    )
    .map((gym) => {
      const daysRemaining = Math.ceil(
        (gym.subscriptionExpiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      )
      return {
        id: gym.id,
        name: gym.name,
        status: gym.subscriptionStatus,
        plan: gym.subscriptionPlan,
        daysRemaining,
        expiresAt: gym.subscriptionExpiresAt,
      }
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining)

  const revenueTrend = await Promise.all(
    Array.from({ length: 6 }, (_, idx) => {
      const { start, end } = getMonthBoundaries(5 - idx)
      return prisma.payment
        .aggregate({
          where: { paymentDate: { gte: start, lte: end } },
          _sum: { amount: true },
        })
        .then((agg) => ({
          month: start.toLocaleString("fr-FR", { month: "short" }),
          revenue: agg._sum.amount ?? 0,
        }))
    }),
  )

  return {
    totalGyms,
    activeGyms,
    suspendedGyms,
    totalMembers,
    totalSubscribers: activeSubscriptions,
    monthlyRevenue: revenueAgg._sum.amount ?? 0,
    statusBreakdown,
    revenueTrend,
    expiringGyms,
  }
}

export async function listGymsForSuperAdmin() {
  const gyms = await prisma.gym.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      users: {
        where: { role: UserRole.GYM_ADMIN },
        select: { id: true },
      },
      _count: {
        select: { members: true, subscriptions: true },
      },
    },
  })

return gyms.map((gym) => {
  const daysRemaining = gym.subscriptionExpiresAt
    ? Math.ceil((gym.subscriptionExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return {
    id: gym.id,
    name: gym.name,
    email: gym.email,
    city: gym.city,
    country: gym.country,
    subscriptionPlan: gym.subscriptionPlan,
    subscriptionStatus: gym.subscriptionStatus,
    subscriptionExpiresAt: gym.subscriptionExpiresAt,
    subscriptionGracePeriodDays: gym.subscriptionGracePeriodDays,
    analyticsSnapshot: gym.analyticsSnapshot ?? undefined,   // ✅ FIX HERE
    daysRemaining,
    memberCount: gym._count.members,
    activeSubscriptions: gym._count.subscriptions,
    updatedAt: gym.updatedAt,
    owner: gym.owner
      ? {
          id: gym.owner.id,
          email: gym.owner.email,
          firstName: gym.owner.firstName,
          lastName: gym.owner.lastName,
        }
      : null,
    adminCount: gym.users.length,
    maxAdminAccounts: gym.maxAdminAccounts,
  }
})

}

export async function getSuperAdminGymDetail(gymId: string) {
  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    include: {
      owner: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      users: {
        where: { role: { in: [UserRole.GYM_OWNER, UserRole.GYM_ADMIN] } },
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
        orderBy: { createdAt: "asc" },
      },
      membershipPlans: {
        orderBy: { durationDays: "asc" },
      },
      subscriptions: {
        select: {
          id: true,
          status: true,
          endDate: true,
        },
        take: 20,
        orderBy: { createdAt: "desc" },
      },
      _count: {
        select: { members: true, subscriptions: true },
      },
    },
  })

  if (!gym) {
    return null
  }

  const daysRemaining = gym.subscriptionExpiresAt
    ? Math.ceil((gym.subscriptionExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const paymentsLast30Days = await prisma.payment.aggregate({
    where: {
      gymId,
      paymentDate: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    _sum: { amount: true },
  })

  const admins = gym.users
    .filter((user) => user.role === UserRole.GYM_ADMIN)
    .map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    }))

  return {
    id: gym.id,
    name: gym.name,
    email: gym.email,
    city: gym.city,
    country: gym.country,
    subscriptionPlan: gym.subscriptionPlan,
    subscriptionStatus: gym.subscriptionStatus,
    subscriptionExpiresAt: gym.subscriptionExpiresAt,
    subscriptionGracePeriodDays: gym.subscriptionGracePeriodDays,
    maxAdminAccounts: gym.maxAdminAccounts,
    analyticsSnapshot: gym.analyticsSnapshot,
    membershipPlans: gym.membershipPlans,
    subscriptions: gym.subscriptions,
    memberCount: gym._count.members,
    activeSubscriptions: gym._count.subscriptions,
    daysRemaining,
    paymentsLast30Days: paymentsLast30Days._sum.amount ?? 0,
    owner: gym.owner,
    admins,
    createdAt: gym.createdAt,
    updatedAt: gym.updatedAt,
  }
}

export async function updateGymFromSuperAdmin(
  gymId: string,
  data: {
    subscriptionStatus: GymSubscriptionStatus
    subscriptionPlan?: GymSubscriptionPlan
    subscriptionExpiresAt?: Date | null
    subscriptionGracePeriodDays?: number
    analyticsSnapshot?: unknown
    maxAdminAccounts?: number
  },
) {
  return prisma.gym.update({
    where: { id: gymId },
    data: {
      subscriptionStatus: data.subscriptionStatus,
      subscriptionPlan: data.subscriptionPlan ?? undefined,
      subscriptionExpiresAt: data.subscriptionExpiresAt ?? null,
      subscriptionGracePeriodDays: data.subscriptionGracePeriodDays ?? undefined,
      analyticsSnapshot: data.analyticsSnapshot ?? undefined,
      maxAdminAccounts: data.maxAdminAccounts ?? undefined,
    },
  })
}

export async function createGymForSuperAdmin(data: {
  name: string
  email: string
  city?: string | null
  country?: string | null
  subscriptionPlan: GymSubscriptionPlan
  subscriptionStatus?: GymSubscriptionStatus
  subscriptionExpiresAt?: Date | null
  subscriptionGracePeriodDays?: number
  analyticsSnapshot?: unknown
  maxAdminAccounts?: number
  owner: {
    email: string
    password: string
    firstName: string
    lastName: string
  }
}) {
  const hashedPassword = await hashPassword(data.owner.password)

  return prisma.$transaction(async (tx) => {
    const gym = await tx.gym.create({
      data: {
        name: data.name,
        email: data.email,
        city: data.city ?? null,
        country: data.country ?? null,
        subscriptionPlan: data.subscriptionPlan,
        subscriptionStatus: data.subscriptionStatus ?? "ACTIVE",
        subscriptionExpiresAt: data.subscriptionExpiresAt ?? null,
        subscriptionGracePeriodDays: data.subscriptionGracePeriodDays ?? 0,
        analyticsSnapshot: gym.analyticsSnapshot ?? undefined,
        maxAdminAccounts: data.maxAdminAccounts ?? 3,
      },
    })

    const owner = await tx.user.create({
      data: {
        email: data.owner.email,
        password: hashedPassword,
        role: UserRole.GYM_OWNER,
        firstName: data.owner.firstName,
        lastName: data.owner.lastName,
        gymId: gym.id,
      },
    })

    await tx.userPreference.create({
      data: { userId: owner.id },
    })

    await tx.gym.update({
      where: { id: gym.id },
      data: { ownerId: owner.id },
    })

    return { ...gym, owner }
  })
}

export async function createGymAdminAccount(gymId: string, data: { email: string; password: string; firstName: string; lastName: string }) {
  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: { maxAdminAccounts: true },
  })

  if (!gym) {
    throw new Error("Gym not found")
  }

  const currentAdmins = await prisma.user.count({
    where: { gymId, role: UserRole.GYM_ADMIN },
  })

  if (currentAdmins >= gym.maxAdminAccounts) {
    throw new Error("MAX_ADMINS_REACHED")
  }

  const hashedPassword = await hashPassword(data.password)
  const admin = await prisma.user.create({
    data: {
      email: data.email,
      password: hashedPassword,
      role: UserRole.GYM_ADMIN,
      firstName: data.firstName,
      lastName: data.lastName,
      gymId,
    },
  })

  await ensurePreference(admin.id)

  return admin
}
