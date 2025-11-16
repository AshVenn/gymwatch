// middleware.ts
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*"],
}

export async function middleware(req: NextRequest) {
  // Récupérer le token JWT NextAuth
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const isLoggedIn = !!token
  const pathname = req.nextUrl.pathname

  const isAdminRoute = pathname.startsWith("/admin")
  const isDashboardRoute = pathname.startsWith("/dashboard")

  // 🔒 Si pas connecté et essaie d'aller sur /dashboard ou /admin → redirige vers /login
  if (!isLoggedIn && (isAdminRoute || isDashboardRoute)) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  // 🔒 Si connecté mais pas SUPER_ADMIN et essaie d'aller sur /admin → renvoie vers /dashboard
  if (isLoggedIn && isAdminRoute && token?.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  // Sinon, laisse passer
  return NextResponse.next()
}
