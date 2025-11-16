// lib/auth-middleware.ts
import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "./db"
import { verifyPassword } from "./auth"

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Identifiants",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            throw new Error("Email et mot de passe requis")
          }

          const user = await db.findUserByEmail(credentials.email)

          if (!user) {
            throw new Error("Utilisateur non trouvé")
          }

          const isValid = await verifyPassword(
            credentials.password,
            user.password
          )

          if (!isValid) {
            throw new Error("Mot de passe incorrect")
          }

          // This object becomes `user` in the jwt callback
          return {
            id: user.id,
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            role: user.role,
            gymId: user.gymId ?? undefined,
          } as any
        } catch (error) {
          // Returning null = login failed
          return null
        }
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
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).role = (token as any).role
        ;(session.user as any).gymId = (token as any).gymId
      }
      return session
    },
  },
}
