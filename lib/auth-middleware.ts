// lib/auth-middleware.ts
import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "./db"
import { verifyPassword } from "./auth"

function isGymSubscriptionInactive(gym?: {
  subscriptionStatus: string
  subscriptionExpiresAt: Date | null
  subscriptionGracePeriodDays: number
} | null) {
  if (!gym) return false
  if (gym.subscriptionStatus === "EXPIRED") return true
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
            throw new Error("PLAN_EXPIRED")
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim(),
          role: user.role,
          gymId: user.gymId ?? undefined,
          subscriptionStatus: gym?.subscriptionStatus ?? null,
          subscriptionExpiresAt: gym?.subscriptionExpiresAt?.toISOString() ?? null,
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
        ;(token as any).subscriptionExpiresAt = (user as any).subscriptionExpiresAt
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).role = (token as any).role
        ;(session.user as any).gymId = (token as any).gymId
        ;(session.user as any).subscriptionStatus = (token as any).subscriptionStatus
        ;(session.user as any).subscriptionExpiresAt = (token as any).subscriptionExpiresAt
      }
      return session
    },
  },
}
