// lib/auth-middleware.ts
import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "./db"
import { verifyPassword } from "./auth"
import { prisma } from "./prisma"

function isGymSubscriptionInactive(gym?: {
  subscriptionStatus: string
  subscriptionExpiresAt: Date | null
  subscriptionGracePeriodDays: number
} | null) {
  if (!gym) return false
  if (gym.subscriptionStatus === "EXPIRED" || gym.subscriptionStatus === "SUSPENDED") return true
  if (!gym.subscriptionExpiresAt) return false

  const graceEnd = new Date(gym.subscriptionExpiresAt)
  graceEnd.setDate(graceEnd.getDate() + (gym.subscriptionGracePeriodDays ?? 0))

  return graceEnd.getTime() < Date.now()
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Identifiants",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("INVALID_CREDENTIALS")
        }

        const user = await db.findUserByEmail(credentials.email)

        if (!user) {
          throw new Error("INVALID_CREDENTIALS")
        }

        const isValid = await verifyPassword(credentials.password, user.password)

        if (!isValid) {
          throw new Error("INVALID_CREDENTIALS")
        }

        const gym = user.gymId ? await db.getGymById(user.gymId) : null

        if (user.role !== "SUPER_ADMIN") {
          if (!gym) {
            throw new Error("GYM_NOT_FOUND")
          }

          if (isGymSubscriptionInactive(gym)) {
            throw new Error("PLAN_INACTIVE")
          }
        }

        let gymVariantId: string | null = user.gymVariantId ?? null
        if (user.role === "GYM_ADMIN") {
          if (!gymVariantId) {
            throw new Error("MISSING_VARIANT")
          }
          const variant = await prisma.gymVariant.findFirst({
            where: { id: gymVariantId, gymId: user.gymId ?? undefined },
            select: { id: true },
          })
          if (!variant) {
            throw new Error("MISSING_VARIANT")
          }
          gymVariantId = variant.id
        }

        const sessionVersion = await db.touchUserSession(user.id)

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
          role: user.role,
          gymId: user.gymId ?? undefined,
          subscriptionStatus: gym?.subscriptionStatus ?? null,
          subscriptionPlan: gym?.subscriptionPlan ?? null,
          billingInterval: gym?.billingInterval ?? null,
          subscriptionExpiresAt: gym?.subscriptionExpiresAt?.toISOString() ?? null,
          isDemo: gym?.isDemo ?? false,
          demoEndsAt: gym?.demoEndsAt?.toISOString() ?? null,
          gymVariantId,
          sessionVersion,
        } as any
      },
    }),
  ],

  pages: {
    signIn: "/login",
  },

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        ;(token as any).role = (user as any).role
        ;(token as any).gymId = (user as any).gymId
        ;(token as any).subscriptionStatus = (user as any).subscriptionStatus
        ;(token as any).subscriptionPlan = (user as any).subscriptionPlan
        ;(token as any).billingInterval = (user as any).billingInterval
        ;(token as any).subscriptionExpiresAt = (user as any).subscriptionExpiresAt
        ;(token as any).isDemo = (user as any).isDemo
        ;(token as any).demoEndsAt = (user as any).demoEndsAt
        ;(token as any).gymVariantId = (user as any).gymVariantId
        ;(token as any).sessionVersion = (user as any).sessionVersion
        ;(token as any).sessionRevoked = false
      } else if (token.sub) {
        const latestVersion = await db.getUserSessionVersion(token.sub)
        if (latestVersion !== null && latestVersion !== (token as any).sessionVersion) {
          ;(token as any).sessionRevoked = true
        }
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        if ((token as any).sessionRevoked) {
          return null
        }
        ;(session.user as any).role = (token as any).role
        ;(session.user as any).gymId = (token as any).gymId
        ;(session.user as any).subscriptionStatus = (token as any).subscriptionStatus
        ;(session.user as any).subscriptionPlan = (token as any).subscriptionPlan
        ;(session.user as any).billingInterval = (token as any).billingInterval
        ;(session.user as any).subscriptionExpiresAt = (token as any).subscriptionExpiresAt
        ;(session.user as any).isDemo = (token as any).isDemo
        ;(session.user as any).demoEndsAt = (token as any).demoEndsAt
        ;(session.user as any).gymVariantId = (token as any).gymVariantId
      }
      return session
    },
  },
}
