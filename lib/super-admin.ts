import { GymSubscriptionStatus, UserRole } from "@prisma/client"
import { prisma } from "./prisma"
import { hashPassword } from "./auth"
import { getPlanFeatures } from "./subscription-plans"
import { resolvePlanPrice } from "./plan-settings"
import { GymPlanTier, GymBillingInterval } from "@prisma/client"
import { resolveGymPlanLimits } from "./plan-settings"

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

function slugifyVariantName(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "") || "principal"
}

function normalizeVariants(
  variants?: { name: string; slug?: string; isDefault?: boolean }[]
) {
  const base =
    variants?.length && variants.some((v) => v.name.trim())
      ? variants
      : [{ name: "Principal", slug: "principal", isDefault: true }]

  const normalized = base.map((variant, index) => ({
    name: variant.name.trim() || `Variant ${index + 1}`,
    slug: slugifyVariantName(variant.slug ?? variant.name),
    isDefault: Boolean(variant.isDefault),
  }))

  if (!normalized.some((v) => v.isDefault)) {
    normalized[0].isDefault = true
  }

  return normalized
}

function resolveVariantMode(
  count?: number,
  variants?: { id: string }[],
) {
  const total = typeof count === "number" ? count : variants?.length ?? 0
  return total > 1 ? "MULTI" : "SINGLE"
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
        billingInterval: true,
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
        billingInterval: gym.billingInterval,
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
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      country: true,
      subscriptionPlan: true,
      billingInterval: true,
      subscriptionPrice: true,
      subscriptionStatus: true,
      subscriptionExpiresAt: true,
      isDemo: true,
      demoEndsAt: true,
      subscriptionGracePeriodDays: true,
      analyticsSnapshot: true,
      updatedAt: true,
      maxAdminAccounts: true,
      planLimitPerVariant: true,
      planLimitPerNetwork: true,
      owner: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      variants: {
        select: { id: true, name: true, slug: true, isDefault: true },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      },
      users: {
        where: { role: UserRole.GYM_ADMIN },
        select: { id: true },
      },
      _count: {
        select: { members: true, subscriptions: true, variants: true },
      },
    },
  })

  return Promise.all(
    gyms.map(async (gym) => {
      const daysRemaining = gym.subscriptionExpiresAt
        ? Math.ceil((gym.subscriptionExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null
      const variantMode = resolveVariantMode(gym._count.variants, gym.variants)
      const planLimits = await resolveGymPlanLimits(gym.subscriptionPlan, {
        perVariant: gym.planLimitPerVariant,
        perNetwork: gym.planLimitPerNetwork,
      })

      return {
        id: gym.id,
        name: gym.name,
        email: gym.email,
        phone: gym.phone,
        address: gym.address,
        city: gym.city,
        country: gym.country,
        subscriptionPlan: gym.subscriptionPlan,
        billingInterval: gym.billingInterval,
        subscriptionPrice: gym.subscriptionPrice,
        subscriptionStatus: gym.subscriptionStatus,
        subscriptionExpiresAt: gym.subscriptionExpiresAt,
        isDemo: gym.isDemo,
        demoEndsAt: gym.demoEndsAt,
        subscriptionGracePeriodDays: gym.subscriptionGracePeriodDays,
        analyticsSnapshot: gym.analyticsSnapshot ?? undefined,
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
        planLimitPerVariant: gym.planLimitPerVariant ?? undefined,
        planLimitPerNetwork: gym.planLimitPerNetwork ?? undefined,
        planLimits,
        variants: gym.variants,
        variantCount: gym._count.variants,
        planFeatures: getPlanFeatures(gym.subscriptionPlan),
        variantMode,
      }
    }),
  )
}

export async function getSuperAdminGymDetail(gymId: string) {
  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      country: true,
      subscriptionPlan: true,
      billingInterval: true,
      subscriptionPrice: true,
      subscriptionStatus: true,
      subscriptionExpiresAt: true,
      isDemo: true,
      demoEndsAt: true,
      subscriptionGracePeriodDays: true,
      analyticsSnapshot: true,
      createdAt: true,
      updatedAt: true,
      maxAdminAccounts: true,
      planLimitPerVariant: true,
      planLimitPerNetwork: true,
      owner: {
        select: { id: true, email: true, firstName: true, lastName: true },
      },
      users: {
        where: { role: { in: [UserRole.GYM_OWNER, UserRole.GYM_ADMIN] } },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, gymVariantId: true, gymVariant: { select: { id: true, name: true, slug: true, isDefault: true } } },
        orderBy: { createdAt: "asc" },
      },
      membershipPlans: {
        orderBy: { durationDays: "asc" },
        include: {
          gymVariant: {
            select: { id: true, name: true, slug: true, isDefault: true },
          },
        },
      },
      variants: {
        select: { id: true, name: true, slug: true, isDefault: true },
        orderBy: [{ isDefault: "desc" }, { name: "asc" }],
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
        select: { members: true, subscriptions: true, variants: true },
      },
    },
  })

  if (!gym) {
    return null
  }

  const daysRemaining = gym.subscriptionExpiresAt
    ? Math.ceil((gym.subscriptionExpiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null
  const variantMode = resolveVariantMode(gym._count.variants, gym.variants)

  const paymentsLast30Days = await prisma.payment.aggregate({
    where: {
      gymId,
      paymentDate: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    _sum: { amount: true },
  })
  const planLimits = await resolveGymPlanLimits(gym.subscriptionPlan, {
    perVariant: gym.planLimitPerVariant,
    perNetwork: gym.planLimitPerNetwork,
  })

  const admins = gym.users
    .filter((user) => user.role === UserRole.GYM_ADMIN)
    .map((user) => ({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      gymVariantId: user.gymVariantId,
      gymVariant: user.gymVariant,
    }))

  return {
    id: gym.id,
    name: gym.name,
    email: gym.email,
    phone: gym.phone,
    address: gym.address,
    city: gym.city,
    country: gym.country,
    subscriptionPlan: gym.subscriptionPlan,
    billingInterval: gym.billingInterval,
    subscriptionPrice: gym.subscriptionPrice,
    subscriptionStatus: gym.subscriptionStatus,
    subscriptionExpiresAt: gym.subscriptionExpiresAt,
    isDemo: gym.isDemo,
    demoEndsAt: gym.demoEndsAt,
    subscriptionGracePeriodDays: gym.subscriptionGracePeriodDays,
    maxAdminAccounts: gym.maxAdminAccounts,
    analyticsSnapshot: gym.analyticsSnapshot,
    membershipPlans: gym.membershipPlans,
    subscriptions: gym.subscriptions,
    variants: gym.variants,
    memberCount: gym._count.members,
    activeSubscriptions: gym._count.subscriptions,
    variantCount: gym._count.variants,
    daysRemaining,
    paymentsLast30Days: paymentsLast30Days._sum.amount ?? 0,
    owner: gym.owner,
    admins,
    createdAt: gym.createdAt,
    updatedAt: gym.updatedAt,
    planFeatures: getPlanFeatures(gym.subscriptionPlan),
      variantMode,
    adminCount: admins.length,
    planLimitPerVariant: gym.planLimitPerVariant ?? undefined,
    planLimitPerNetwork: gym.planLimitPerNetwork ?? undefined,
    planLimits,
  }
}

export async function updateGymFromSuperAdmin(
  gymId: string,
  data: {
    name?: string
    email?: string
    phone?: string | null
    city?: string | null
    country?: string | null
    address?: string | null
    subscriptionStatus: GymSubscriptionStatus
    subscriptionPlan?: GymPlanTier
    billingInterval?: GymBillingInterval
    subscriptionExpiresAt?: Date | null
    subscriptionGracePeriodDays?: number
    analyticsSnapshot?: unknown
    maxAdminAccounts?: number
    isDemo?: boolean
    demoEndsAt?: Date | null
    planLimitPerVariant?: number | null
    planLimitPerNetwork?: number | null
  },
) {
  let subscriptionPrice: number | undefined

  if (data.subscriptionPlan || data.billingInterval) {
    const current = await prisma.gym.findUnique({
      where: { id: gymId },
      select: { subscriptionPlan: true, billingInterval: true },
    })

    const plan = data.subscriptionPlan ?? current?.subscriptionPlan ?? "BASIC"
    const interval = data.billingInterval ?? current?.billingInterval ?? "MONTHLY"
    subscriptionPrice = await resolvePlanPrice(plan, interval)
  }

  const updatedGym = await prisma.gym.update({
    where: { id: gymId },
    data: {
      name: data.name ?? undefined,
      email: data.email ?? undefined,
      phone: data.phone ?? undefined,
      city: data.city ?? undefined,
      country: data.country ?? undefined,
      address: data.address ?? undefined,
      subscriptionStatus: data.subscriptionStatus,
      subscriptionPlan: data.subscriptionPlan ?? undefined,
      billingInterval: data.billingInterval ?? undefined,
      subscriptionPrice,
      subscriptionExpiresAt: data.subscriptionExpiresAt ?? null,
      subscriptionGracePeriodDays: data.subscriptionGracePeriodDays ?? undefined,
      analyticsSnapshot: data.analyticsSnapshot ?? undefined,
      maxAdminAccounts: data.maxAdminAccounts ?? undefined,
      isDemo: typeof data.isDemo === "boolean" ? data.isDemo : undefined,
      demoEndsAt: data.demoEndsAt ?? undefined,
      planLimitPerVariant: data.planLimitPerVariant ?? undefined,
      planLimitPerNetwork: data.planLimitPerNetwork ?? undefined,
    },
  })

  const variantCount = await prisma.gymVariant.count({ where: { gymId } })

  return {
    ...updatedGym,
    planFeatures: getPlanFeatures(updatedGym.subscriptionPlan),
    variantMode: resolveVariantMode(variantCount),
  }
}

export async function createGymForSuperAdmin(data: {
  name: string
  email: string
  phone: string
  address?: string | null
  city?: string | null
  country?: string | null
  subscriptionPlan: GymPlanTier
  billingInterval?: GymBillingInterval
  subscriptionStatus?: GymSubscriptionStatus
  subscriptionExpiresAt?: Date | null
  subscriptionGracePeriodDays?: number
  analyticsSnapshot?: unknown
  maxAdminAccounts?: number
  isDemo?: boolean
  demoEndsAt?: Date | null
  planLimitPerVariant?: number | null
  planLimitPerNetwork?: number | null
  admins?: {
    email: string
    password: string
    firstName: string
    lastName: string
    variantSlug?: string
  }[]
  variants?: { name: string; slug?: string; isDefault?: boolean }[]
  owner: {
    email: string
    password: string
    firstName: string
    lastName: string
  }
}) {
  const hashedPassword = await hashPassword(data.owner.password)
  const interval = data.billingInterval ?? "MONTHLY"
  const subscriptionPrice = await resolvePlanPrice(data.subscriptionPlan, interval)
  const adminLimit = data.maxAdminAccounts ?? 3
  const variantsPayload = normalizeVariants(data.variants)

  return prisma.$transaction(async (tx) => {
    const gym = await tx.gym.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address ?? null,
        city: data.city ?? null,
        country: data.country ?? null,
        subscriptionPlan: data.subscriptionPlan,
        billingInterval: interval,
        subscriptionPrice,
        subscriptionStatus: data.subscriptionStatus ?? "ACTIVE",
        subscriptionExpiresAt: data.subscriptionExpiresAt ?? null,
        subscriptionGracePeriodDays: data.subscriptionGracePeriodDays ?? 0,
        analyticsSnapshot: data.analyticsSnapshot ?? undefined,
        maxAdminAccounts: adminLimit,
        isDemo: data.isDemo ?? false,
        demoEndsAt: data.demoEndsAt ?? null,
        planLimitPerVariant: data.planLimitPerVariant ?? null,
        planLimitPerNetwork: data.planLimitPerNetwork ?? null,
      },
    })

    const variants = await Promise.all(
      variantsPayload.map((variant) =>
        tx.gymVariant.create({
          data: {
            gymId: gym.id,
            name: variant.name,
            slug: variant.slug,
            isDefault: variant.isDefault,
          },
        }),
      ),
    )

    const defaultVariant = variants.find((v) => v.isDefault) ?? variants[0]

    const owner = await tx.user.create({
      data: {
        email: data.owner.email,
        password: hashedPassword,
        role: UserRole.GYM_OWNER,
        firstName: data.owner.firstName,
        lastName: data.owner.lastName,
        gymId: gym.id,
        gymVariantId: defaultVariant?.id ?? null,
      },
    })

    await tx.userPreference.create({
      data: { userId: owner.id },
    })

    await tx.gym.update({
      where: { id: gym.id },
      data: { ownerId: owner.id },
    })

    const adminUsers: {
      id: string
      email: string
      firstName: string | null
      lastName: string | null
    }[] = []

    if (data.admins?.length) {
      for (const admin of data.admins.slice(0, adminLimit)) {
        const hashedAdminPassword = await hashPassword(admin.password)
        const adminVariant =
          variants.find((variant) => variant.slug === slugifyVariantName(admin.variantSlug ?? "")) ??
          defaultVariant
        const created = await tx.user.create({
          data: {
            email: admin.email,
            password: hashedAdminPassword,
            role: UserRole.GYM_ADMIN,
            firstName: admin.firstName,
            lastName: admin.lastName,
            gymId: gym.id,
            gymVariantId: adminVariant?.id ?? null,
          },
        })
        await tx.userPreference.create({ data: { userId: created.id } })
        adminUsers.push({
          id: created.id,
          email: created.email,
          firstName: created.firstName,
          lastName: created.lastName,
        })
      }
    }

    return {
      ...gym,
      owner,
      admins: adminUsers,
      variants,
      planFeatures: getPlanFeatures(gym.subscriptionPlan),
      variantMode: resolveVariantMode(variants.length, variants),
    }
  })
}

export async function createGymAdminAccount(
  gymId: string,
  data: { email: string; password: string; firstName: string; lastName: string; gymVariantId?: string }
) {
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

  const targetVariant =
    data.gymVariantId &&
    (await prisma.gymVariant.findFirst({
      where: { id: data.gymVariantId, gymId },
      select: { id: true },
    }))

  const defaultVariant =
    targetVariant ??
    (await prisma.gymVariant.findFirst({
      where: { gymId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      select: { id: true },
    }))

  if (!defaultVariant) {
    throw new Error("NO_VARIANT")
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
      gymVariantId: defaultVariant.id,
    },
  })

  await ensurePreference(admin.id)

  return admin
}

export async function deleteGymFromSuperAdmin(gymId: string) {
  return prisma.$transaction(async (tx) => {
    const gym = await tx.gym.findUnique({
      where: { id: gymId },
      select: { id: true, subscriptionStatus: true, ownerId: true },
    })

    if (!gym) {
      throw new Error("NOT_FOUND")
    }

    if (gym.subscriptionStatus === GymSubscriptionStatus.ACTIVE) {
      throw new Error("ACTIVE_GYM")
    }

    await tx.subscription.deleteMany({ where: { gymId } })
    await tx.payment.deleteMany({ where: { gymId } })
    await tx.member.deleteMany({ where: { gymId } })
    await tx.membershipPlan.deleteMany({ where: { gymId } })

    await tx.user.deleteMany({
      where: {
        OR: [
          { gymId },
          ...(gym.ownerId ? [{ id: gym.ownerId }] : []),
        ],
      },
    })

    await tx.gym.delete({ where: { id: gymId } })
  })
}
