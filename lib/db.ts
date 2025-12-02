import { prisma } from "./prisma"
import { resolvePlanPrice } from "./subscription-plans"
import { GymPlanTier, GymBillingInterval } from "@prisma/client"

export const db = {
  // Users
  findUserByEmail: async (email: string) => prisma.user.findUnique({ where: { email } }),

  findUserById: async (id: string) => prisma.user.findUnique({ where: { id } }),

  createUser: async (data: any) => prisma.user.create({ data }),

  // Gyms
  findGymByEmail: async (email: string) => prisma.gym.findUnique({ where: { email } }),

  getGymById: async (id: string) => prisma.gym.findUnique({ where: { id } }),

  createGym: async (data: {
    name: string
    email: string
    city?: string | null
    country?: string | null
    subscriptionPlan?: GymPlanTier
    billingInterval?: GymBillingInterval
    maxAdminAccounts?: number
  }) => {
    const plan: GymPlanTier = data.subscriptionPlan ?? "BASIC"
    const interval: GymBillingInterval = data.billingInterval ?? "MONTHLY"
    return prisma.gym.create({
      data: {
        name: data.name,
        email: data.email,
        city: data.city ?? null,
        country: data.country ?? null,
        subscriptionPlan: plan,
        billingInterval: interval,
        subscriptionPrice: resolvePlanPrice(plan, interval),
        maxAdminAccounts: data.maxAdminAccounts ?? 3,
      },
    })
  },

  updateGym: async (
    id: string,
    data: {
      name?: string
      email?: string
      phone?: string | null
      address?: string | null
      city?: string | null
      country?: string | null
      logoUrl?: string | null
    },
  ) =>
    prisma.gym.update({
      where: { id },
      data,
    }),

  // Variants
  getGymVariants: async (gymId: string) =>
    prisma.gymVariant.findMany({
      where: { gymId },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true, isDefault: true },
    }),

  // Members
  getMembers: async (gymId: string, gymVariantId?: string) =>
    prisma.member.findMany({
      where: {
        gymId,
        ...(gymVariantId ? { gymVariantId } : {}),
      },
      include: { gymVariant: { select: { id: true, name: true, slug: true } } },
      orderBy: { firstName: "asc" },
    }),

  createMember: async (data: {
    gymId: string
    gymVariantId: string
    firstName: string
    lastName: string
    email?: string | null
    phone?: string | null
  }) =>
    prisma.member.create({
      data: {
        gymId: data.gymId,
        gymVariantId: data.gymVariantId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email ?? null,
        phone: data.phone ?? null,
      },
    }),

  updateMember: async (
    id: string,
    data: {
      firstName: string
      lastName: string
      email?: string | null
      phone?: string | null
    },
  ) =>
    prisma.member.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email ?? null,
        phone: data.phone ?? null,
      },
    }),

  deleteMember: async (id: string) =>
    prisma.member.delete({
      where: { id },
    }),

  // Plans
  getPlans: async (gymId: string, gymVariantId?: string) =>
    prisma.membershipPlan.findMany({
      where: {
        gymId,
        isActive: true,
        ...(gymVariantId ? { gymVariantId } : {}),
      },
      include: { gymVariant: { select: { id: true, name: true, slug: true, isDefault: true } } },
      orderBy: { durationDays: "asc" },
    }),

  createPlan: async (data: {
    gymId: string
    gymVariantId: string
    name: string
    durationDays: number
    price: number
  }) =>
    prisma.membershipPlan.create({
      data: {
        gymId: data.gymId,
        gymVariantId: data.gymVariantId,
        name: data.name,
        durationDays: data.durationDays,
        price: data.price,
        isActive: true,
      },
    }),

  updatePlan: async (
    id: string,
    data: {
      name: string
      durationDays: number
      price: number
    },
  ) =>
    prisma.membershipPlan.update({
      where: { id },
      data: {
        name: data.name,
        durationDays: data.durationDays,
        price: data.price,
      },
    }),

  // Soft-delete plan
  deletePlan: async (id: string) =>
    prisma.membershipPlan.update({
      where: { id },
      data: {
        isActive: false,
      },
    }),

  // Subscriptions
  getSubscriptions: async (gymId: string, gymVariantId?: string) =>
    prisma.subscription.findMany({
      where: {
        gymId,
        ...(gymVariantId ? { gymVariantId } : {}),
      },
      orderBy: { endDate: "desc" },
      include: { member: true, plan: { include: { gymVariant: true } }, gymVariant: true },
    }),

  // Dashboard stats
  getDashboardStats: async (gymId: string, gymVariantId?: string) => {
    const activeMembers = await prisma.subscription.count({
      where: {
        gymId,
        ...(gymVariantId ? { gymVariantId } : {}),
        status: "ACTIVE",
      },
    })

    const newMembers = await prisma.member.count({
      where: {
        gymId,
        ...(gymVariantId ? { gymVariantId } : {}),
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    })

    const monthlyRevenue = await prisma.subscription.aggregate({
      where: {
        gymId,
        ...(gymVariantId ? { gymVariantId } : {}),
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
      _sum: { pricePaid: true },
    })

    return {
      activeMembers,
      newMembers,
      monthlyRevenue: monthlyRevenue._sum.pricePaid || 0,
    }
  },

  touchUserSession: async (userId: string) => {
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { sessionVersion: { increment: 1 } },
        select: { sessionVersion: true },
      })
      return updated.sessionVersion ?? 0
    } catch (error) {
      console.warn('[session-version] fallback engaged', error)
      return 0
    }
  },

  getUserSessionVersion: async (userId: string) => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { sessionVersion: true },
      })
      return user?.sessionVersion ?? null
    } catch (error) {
      console.warn('[session-version] unable to read version, assuming null', error)
      return null
    }
  },
}
