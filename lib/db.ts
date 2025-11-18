// lib/db.ts
import { prisma } from "./prisma"
import type { Prisma } from "@prisma/client"
import { resolvePlanPrice } from "./subscription-plans"

type GymPlanTier = Prisma.GymPlanTier
type GymBillingInterval = Prisma.GymBillingInterval

export const db = {
  // 🔹 Users
  findUserByEmail: async (email: string) => {
    return prisma.user.findUnique({ where: { email } })
  },

  findUserById: async (id: string) => {
    return prisma.user.findUnique({ where: { id } })
  },

  createUser: async (data: any) => {
    return prisma.user.create({ data })
  },

  // 🔹 Gyms
  findGymByEmail: async (email: string) => {
    return prisma.gym.findUnique({ where: { email } })
  },

  getGymById: async (id: string) => {
    return prisma.gym.findUnique({ where: { id } })
  },

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
    }
  ) => {
    return prisma.gym.update({
      where: { id },
      data,
    })
  },

  // 🔹 Members
  getMembers: async (gymId: string) => {
    return prisma.member.findMany({
      where: { gymId },
      orderBy: { firstName: "asc" },
    })
  },

  createMember: async (data: {
    gymId: string
    firstName: string
    lastName: string
    email?: string | null
    phone?: string | null
  }) => {
    return prisma.member.create({
      data: {
        gymId: data.gymId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email ?? null,
        phone: data.phone ?? null,
      },
    })
  },

  updateMember: async (
    id: string,
    data: {
      firstName: string
      lastName: string
      email?: string | null
      phone?: string | null
    }
  ) => {
    return prisma.member.update({
      where: { id },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email ?? null,
        phone: data.phone ?? null,
      },
    })
  },

  deleteMember: async (id: string) => {
    return prisma.member.delete({
      where: { id },
    })
  },

  // 🔹 Plans
  getPlans: async (gymId: string) => {
    return prisma.membershipPlan.findMany({
      where: { gymId, isActive: true },
      orderBy: { durationDays: "asc" },
    })
  },

  createPlan: async (data: {
    gymId: string
    name: string
    durationDays: number
    price: number
  }) => {
    return prisma.membershipPlan.create({
      data: {
        gymId: data.gymId,
        name: data.name,
        durationDays: data.durationDays,
        price: data.price,
        isActive: true,
      },
    })
  },

  updatePlan: async (
    id: string,
    data: {
      name: string
      durationDays: number
      price: number
    }
  ) => {
    return prisma.membershipPlan.update({
      where: { id },
      data: {
        name: data.name,
        durationDays: data.durationDays,
        price: data.price,
      },
    })
  },

  // on soft-delete le plan (isActive = false)
  deletePlan: async (id: string) => {
    return prisma.membershipPlan.update({
      where: { id },
      data: {
        isActive: false,
      },
    })
  },

  // 🔹 Subscriptions
  getSubscriptions: async (gymId: string) => {
    return prisma.subscription.findMany({
      where: { gymId },
      orderBy: { endDate: "desc" },
      include: { member: true, plan: true },
    })
  },

  // 🔹 Dashboard stats
  getDashboardStats: async (gymId: string) => {
    const activeMembers = await prisma.subscription.count({
      where: { gymId, status: "ACTIVE" },
    })

    const newMembers = await prisma.member.count({
      where: {
        gymId,
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    })

    const monthlyRevenue = await prisma.subscription.aggregate({
      where: {
        gymId,
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
}
