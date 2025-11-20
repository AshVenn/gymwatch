// middleware.ts
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/super-admin/:path*", "/login", "/register", "/request-demo"],
}

export async function middleware(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const isLoggedIn = !!token
  const pathname = req.nextUrl.pathname

  const isAdminRoute = pathname.startsWith("/admin")
  const isSuperAdminRoute = pathname.startsWith("/super-admin")
  const isDashboardRoute = pathname.startsWith("/dashboard")
  const isAuthOrDemoRoute = ["/login", "/register", "/request-demo"].includes(pathname)

  if (isLoggedIn && isAuthOrDemoRoute) {
    return NextResponse.redirect(new URL("/", req.url))
  }

  if (!isLoggedIn && (isAdminRoute || isDashboardRoute || isSuperAdminRoute)) {
    return NextResponse.redirect(new URL("/login", req.url))
  }

  if (isLoggedIn && (isAdminRoute || isSuperAdminRoute) && token?.role !== "SUPER_ADMIN") {
    return NextResponse.redirect(new URL("/dashboard", req.url))
  }

  return NextResponse.next()
}
