// middleware.ts
import createIntlMiddleware from "next-intl/middleware"
import { NextRequest, NextResponse } from "next/server"
import { getToken } from "next-auth/jwt"

import { routing, type AppLocale } from "./i18n/routing"

export const config = {
  matcher: ["/api/seeder/:path*", "/((?!_next|api|.*\\..*).*)"],
}

const intlMiddleware = createIntlMiddleware(routing)
const localeMatcher = new RegExp(`^/(${routing.locales.join("|")})(?=/|$)`)

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname

  if (pathname.startsWith("/api/seeder")) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 })
  }

  // ✅ évite la boucle /fr/ -> /fr
  if (routing.locales.some((l) => pathname === `/${l}/`)) {
    return NextResponse.next()
  }

  // 1) next-intl d'abord
  const intlResponse = intlMiddleware(req)

  // ✅ Si next-intl fait un redirect/rewrite, on le respecte direct
  if (intlResponse) {
    return intlResponse
  }

  // 2) Auth logic sur le pathname actuel
  const localeFromPath = pathname.split("/")[1] as AppLocale | undefined
  const locale = routing.locales.includes(localeFromPath as AppLocale)
    ? (localeFromPath as AppLocale)
    : routing.defaultLocale

  const normalizedPath = pathname.replace(localeMatcher, "") || "/"

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const isLoggedIn = !!token

  const isAdminRoute = normalizedPath.startsWith("/admin")
  const isSuperAdminRoute = normalizedPath.startsWith("/super-admin")
  const isDashboardRoute = normalizedPath.startsWith("/dashboard")

  // ✅ inclure aussi docs/pages publiques si besoin
  const isAuthOrDemoRoute = ["/login", "/register", "/request-demo"].includes(normalizedPath)

  const buildUrl = (path: string) =>
    new URL(`/${locale}${path.startsWith("/") ? path : `/${path}`}`, req.url)

  // Redirects
  if (isLoggedIn && isAuthOrDemoRoute) {
    return NextResponse.redirect(buildUrl("/"))
  }

  if (!isLoggedIn && (isAdminRoute || isDashboardRoute || isSuperAdminRoute)) {
    return NextResponse.redirect(buildUrl("/login"))
  }

  const isPlatformRole = token?.role === "SUPER_ADMIN" || token?.role === "SUPER_MANAGER"

  if (isLoggedIn && (isAdminRoute || isSuperAdminRoute) && !isPlatformRole) {
    return NextResponse.redirect(buildUrl("/dashboard"))
  }

  // ✅ Rien à faire: continuer la requête
  return NextResponse.next()
}
