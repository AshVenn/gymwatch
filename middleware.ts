// middleware.ts
import createIntlMiddleware from 'next-intl/middleware'
import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'

import { routing, type AppLocale } from './i18n/routing'

// Apply middleware to everything except Next internals, api and static files
export const config = {
  matcher: ['/((?!_next|api|.*\\..*).*)'],
}

const intlMiddleware = createIntlMiddleware(routing)
const localeMatcher = new RegExp(`^/(${routing.locales.join('|')})(?=/|$)`)

export async function middleware(req: NextRequest) {
  // 1) Let next-intl handle locale detection / rewrites
  const intlResponse = intlMiddleware(req)

  // 2) Now run your auth logic based on the *current* URL
  const pathname = req.nextUrl.pathname

  const localeFromPath = pathname.split('/')[1] as AppLocale | undefined
  const locale = routing.locales.includes(localeFromPath as AppLocale)
    ? (localeFromPath as AppLocale)
    : routing.defaultLocale

  const normalizedPath = pathname.replace(localeMatcher, '') || '/'

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  })

  const isLoggedIn = !!token

  const isAdminRoute = normalizedPath.startsWith('/admin')
  const isSuperAdminRoute = normalizedPath.startsWith('/super-admin')
  const isDashboardRoute = normalizedPath.startsWith('/dashboard')
  const isAuthOrDemoRoute = ['/login', '/register', '/request-demo'].includes(normalizedPath)

  const buildUrl = (path: string) =>
    new URL(`/${locale}${path.startsWith('/') ? path : `/${path}`}`, req.url)

  // Redirects
  if (isLoggedIn && isAuthOrDemoRoute) {
    return NextResponse.redirect(buildUrl('/'))
  }

  if (!isLoggedIn && (isAdminRoute || isDashboardRoute || isSuperAdminRoute)) {
    return NextResponse.redirect(buildUrl('/login'))
  }

  if (isLoggedIn && (isAdminRoute || isSuperAdminRoute) && token?.role !== 'SUPER_ADMIN') {
    return NextResponse.redirect(buildUrl('/dashboard'))
  }

  // 3) No auth redirect → return the intl response
  return intlResponse
}
