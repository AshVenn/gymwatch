import { createNavigation } from "next-intl/navigation"
import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales: ["en", "fr", "ar"] as const,
  defaultLocale: "fr",
  localePrefix: "always",
  pathnames: {
    "/": "/",
    "/about": "/about",
    "/contact": "/contact",
    "/features": "/features",
    "/cookies": "/cookies",
    "/privacy": "/privacy",
    "/licenses": "/licenses",
    "/docs": "/docs",
    "/terms": "/terms",

    "/plans": {
      en: "/pricing",
      fr: "/plans",
      ar: "/plans",
    },
    "/faqs": {
      en: "/faq",
      fr: "/faq",
      ar: "/faq",
    },
    "/clubs": "/clubs",

    "/ressources": "/ressources",
    "/login": "/login",
    "/register": "/register",
    "/request-demo": "/request-demo",
    "/dashboard": "/dashboard",
    "/dashboard/members": "/dashboard/members",
    "/dashboard/badges": "/dashboard/badges",
    "/dashboard/subscriptions": "/dashboard/subscriptions",
    "/dashboard/access-logs": "/dashboard/access-logs",
    "/dashboard/presence": "/dashboard/presence",
    "/dashboard/classes": "/dashboard/classes",
    "/dashboard/plans": "/dashboard/plans",
    "/dashboard/settings": "/dashboard/settings",

    "/admin": "/admin",
    "/super-admin": "/super-admin",
    "/super-admin/plan-setup": "/super-admin/plan-setup",
    "/super-admin/gyms": "/super-admin/gyms",
    "/super-admin/users": "/super-admin/users",
    "/super-admin/audit": "/super-admin/audit",
    "/super-admin/demo-requests": "/super-admin/demo-requests",
    "/super-admin/partners": "/super-admin/partners",
    "/super-admin/settings": "/super-admin/settings",
  },
})

export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing)

export type AppLocale = (typeof routing.locales)[number]
