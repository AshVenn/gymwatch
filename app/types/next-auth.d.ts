import NextAuth, { DefaultSession, DefaultUser } from "next-auth"

declare module "next-auth" {
  interface User extends DefaultUser {
    role?: string
    gymId?: string
  }

  interface Session {
    user: {
      role?: string
      gymId?: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role?: string
    gymId?: string
  }
}
