import type { DefaultSession, DefaultUser } from "next-auth"
import type { GymBillingInterval, GymPlanTier, UserRole, UserStatus } from "@prisma/client"

declare module "next-auth" {
  interface User extends DefaultUser {
    role?: UserRole
    status?: UserStatus
    gymId?: string
    gymVariantId?: string | null
    subscriptionStatus?: string | null
    subscriptionExpiresAt?: string | null
    subscriptionGracePeriodDays?: number | null
    subscriptionPlan?: GymPlanTier | null
    billingInterval?: GymBillingInterval | null
    isDemo?: boolean
    demoEndsAt?: string | null
    lastLoginAt?: string | null
  }

  interface Session {
    user: {
      id?: string
      role?: UserRole
      status?: UserStatus
      gymId?: string
      gymVariantId?: string | null
      subscriptionStatus?: string | null
      subscriptionExpiresAt?: string | null
      subscriptionGracePeriodDays?: number | null
      subscriptionPlan?: GymPlanTier | null
      billingInterval?: GymBillingInterval | null
      isDemo?: boolean
      demoEndsAt?: string | null
      lastLoginAt?: string | null
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string
    role?: UserRole
    status?: UserStatus
    gymId?: string
    gymVariantId?: string | null
    subscriptionStatus?: string | null
    subscriptionExpiresAt?: string | null
    subscriptionGracePeriodDays?: number | null
    subscriptionPlan?: GymPlanTier | null
    billingInterval?: GymBillingInterval | null
    isDemo?: boolean
    demoEndsAt?: string | null
    lastLoginAt?: string | null
  }
}
