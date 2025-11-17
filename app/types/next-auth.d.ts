import NextAuth, { DefaultSession, DefaultUser } from "next-auth"
import { UserRole } from "@prisma/client"

declare module "next-auth" {
  interface User extends DefaultUser {
    role?: UserRole
    gymId?: string
    subscriptionStatus?: string | null
    subscriptionExpiresAt?: string | null
  }

  interface Session {
    user: {
      role?: UserRole
      gymId?: string
      subscriptionStatus?: string | null
      subscriptionExpiresAt?: string | null
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: UserRole
    gymId?: string
    subscriptionStatus?: string | null
    subscriptionExpiresAt?: string | null
  }
}
