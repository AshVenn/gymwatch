"use client"

import { type ComponentProps, type ReactNode, useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { useSession, signOut } from "next-auth/react"
import type { LucideIcon } from "lucide-react"
import { Check, Globe2, LogOut, Menu, ShieldCheck, User, X } from "lucide-react"
import { toast } from "sonner"
import { useLocale, useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  Link,
  routing,
  usePathname,
  useRouter,
  type AppLocale,
} from "@/i18n/routing"
import { cn } from "@/lib/utils"

export const UserRole = {
  SUPER_ADMIN: "SUPER_ADMIN",
  SUPER_MANAGER: "SUPER_MANAGER",
  GYM_OWNER: "GYM_OWNER",
  GYM_ADMIN: "GYM_ADMIN",
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]

type NavigationHref = ComponentProps<typeof Link>["href"]

export type NavigationItem = {
  href: NavigationHref
  label: string
  icon: LucideIcon
}

interface DashboardShellProps {
  children: ReactNode
  navigationItems: NavigationItem[]
  allowedRoles?: UserRole[]
  fallbackRoute?: string
  topSlot?: ReactNode
}

export function DashboardShell({
  children,
  navigationItems,
  allowedRoles,
  fallbackRoute = "/login",
  topSlot,
}: DashboardShellProps) {
  const locale = useLocale() as AppLocale
  const tShell = useTranslations("dashboard.shell")
  const isRtl = locale === "ar"

  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  const normalizedPathname = useMemo(() => {
    const localePattern = new RegExp(`^/(?:${routing.locales.join("|")})(?=/|$)`)
    return pathname?.replace(localePattern, "") || "/"
  }, [pathname])

  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isAllowed = useMemo(() => {
    if (!allowedRoles?.length) return true
    const userRole = session?.user?.role
    return userRole ? allowedRoles.includes(userRole as UserRole) : false
  }, [allowedRoles, session?.user?.role])

  const subscriptionPastDue = useMemo(() => {
    if (!session?.user) return false
    const userRole = session.user.role as UserRole
    if (userRole === UserRole.SUPER_ADMIN || userRole === UserRole.SUPER_MANAGER) return false
    if (
      session.user.subscriptionStatus === "EXPIRED" ||
      session.user.subscriptionStatus === "SUSPENDED"
    )
      return true
    const expiresAt = session.user.subscriptionExpiresAt
    if (!expiresAt) return false
    const parsed = new Date(expiresAt)
    if (Number.isNaN(parsed.getTime())) return false
    return parsed.getTime() < Date.now()
  }, [session?.user])

  useEffect(() => {
    if (status === "loading") return

    if (status === "unauthenticated" || !session?.user) {
      router.replace("/login" as any, { locale })
      return
    }

    if (allowedRoles?.length && !isAllowed) {
      router.replace((fallbackRoute || "/login") as any, { locale })
    }
  }, [allowedRoles, fallbackRoute, isAllowed, locale, router, session?.user, status])

  useEffect(() => {
    if (!subscriptionPastDue || status !== "authenticated") return
    toast.error(tShell("subscriptionExpired"))
    signOut({ callbackUrl: `/${locale}/login` })
  }, [locale, status, subscriptionPastDue, tShell])

  const languageOptions = useMemo(
    () =>
      routing.locales.map((code) => ({
        code,
        label: code === "fr" ? "Français" : code === "en" ? "English" : "العربية",
      })),
    [],
  )

  const currentLanguage = languageOptions.find((option) => option.code === locale)

  const handleLocaleChange = (targetLocale: AppLocale) => {
    if (targetLocale === locale) return
    const targetPath = normalizedPathname || "/"
    router.replace(targetPath as any, { locale: targetLocale })
    router.refresh()
  }

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/20 border-t-primary" />
          <p className="text-lg font-semibold text-muted-foreground">
            {tShell("loading")}
          </p>
        </div>
      </div>
    )
  }

  if (!session?.user || (allowedRoles?.length && !isAllowed)) {
    return null
  }

  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: tShell("roles.superAdmin"),
    SUPER_MANAGER: tShell("roles.superManager"),
    ADMIN: tShell("roles.admin"),
    OWNER: tShell("roles.owner"),
    USER: tShell("roles.user"),
    GYM_ADMIN: tShell("roles.admin"),
    GYM_OWNER: tShell("roles.owner"),
  }

  const userDisplayName =
    session.user.name || session.user.email || tShell("userFallback")
  const userRole =
    roleLabels[session.user.role as string] ||
    session.user.role ||
    tShell("userFallback")
  const userInitial = userDisplayName.charAt(0).toUpperCase()
  const isDemoGym = Boolean((session.user as any).isDemo)
  const planLabel = (session.user as any)?.subscriptionPlan ?? tShell("planLabel")
  const billingIntervalRaw = (session.user as any)?.billingInterval
  const billingInterval =
    billingIntervalRaw === "ANNUAL"
      ? tShell("billing.annual")
      : billingIntervalRaw === "MONTHLY"
        ? tShell("billing.monthly")
        : tShell("billing.generic")

  return (
    <div className={cn("relative flex min-h-screen bg-background text-foreground", isRtl && "md:flex-row-reverse")}>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_14%_18%,hsl(var(--primary)/0.08),transparent_28%),radial-gradient(circle_at_70%_10%,hsl(var(--muted-foreground)/0.04),transparent_24%)]" />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 z-50 flex h-full w-72 flex-col overflow-y-auto border-r border-border/60 bg-card/98 text-card-foreground shadow-2xl backdrop-blur-xl transition-transform duration-300 md:translate-x-0",
          isRtl ? "right-0 left-auto border-l border-r-0" : "left-0",
          "[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]",
          sidebarOpen ? "translate-x-0" : isRtl ? "translate-x-full" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border/60 px-6 py-5 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-primary/10 p-2 ring-2 ring-primary/20">
                <Image
                  src="/GymWatch.svg"
                  alt="GymWatch"
                  width={64}
                  height={64}
                  priority
                  className="dark:invert dark:brightness-200"
                />
              </div>
              <div className="leading-tight">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  GymWatch
                </p>
                <p className="text-base font-bold">{tShell("console")}</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg border border-border/60 p-1.5 text-muted-foreground transition hover:bg-muted md:hidden"
              aria-label={tShell("closeMenu")}
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <nav className="space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon
                const isActive =
                  normalizedPathname === item.href ||
                  normalizedPathname.startsWith(`${item.href}/`)
                const itemKey =
                  typeof item.href === "string"
                    ? item.href
                    : item.href.pathname ?? item.label
                return (
                  <Link
                    key={itemKey}
                    href={item.href}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all hover-lift",
                      isActive
                        ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                        : "text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                    )}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg transition-all",
                        isActive
                          ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                          : "bg-muted/60 text-muted-foreground group-hover:bg-muted group-hover:text-foreground",
                      )}
                    >
                      <Icon size={18} strokeWidth={2.5} />
                    </div>
                    <div className="flex-1 text-left">{item.label}</div>
                    {isActive && (
                      <div className="h-2 w-2 rounded-full bg-primary shadow-sm shadow-primary/50" />
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>

          <div className="border-t border-border/60 bg-muted/20 px-4 py-5">
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 px-4 py-3 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 font-bold text-primary ring-2 ring-primary/20">
                {userInitial}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{userDisplayName}</p>
                <p className="text-xs text-muted-foreground">{userRole}</p>
              </div>
              {isDemoGym && (
                <Badge variant="warning" className="shrink-0">
                  {tShell("demoBadge")}
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex flex-col gap-1.5">
                <span className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <ShieldCheck size={14} className="text-primary" /> {planLabel}
                </span>
                <Badge variant="outline" className="w-fit text-[10px] uppercase tracking-wider px-2 py-0.5">
                  {billingInterval}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg border-border/70 bg-background text-foreground shadow-xs hover:bg-muted hover:shadow-sm"
                onClick={() => signOut({ callbackUrl: `/${locale}/login` })}
              >
                <LogOut size={16} />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      <div
        className={cn("flex flex-1 flex-col overflow-hidden transition-all", isRtl ? "md:pr-72 md:pl-0" : "md:pl-72")}
      >
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/80 px-5 py-4 backdrop-blur-xl shadow-sm md:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                className="rounded-xl border-border/60 bg-card text-muted-foreground shadow-xs hover:text-foreground hover:shadow-sm md:hidden"
                onClick={() => setSidebarOpen(!sidebarOpen)}
                aria-label={tShell("openMenu")}
              >
                <Menu size={18} />
              </Button>

              <ThemeToggle />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="gap-2 rounded-xl border-border/60 bg-card px-3 text-sm font-semibold shadow-xs hover:shadow-sm"
                  >
                    <Globe2 className="h-4 w-4" />
                    <span>{currentLanguage?.label ?? locale.toUpperCase()}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {languageOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.code}
                      className="flex items-center justify-between"
                      onClick={() => handleLocaleChange(option.code)}
                    >
                      <span>{option.label}</span>
                      {option.code === locale && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden flex-col items-end md:flex">
                <p className="text-sm font-semibold text-foreground">{userDisplayName}</p>
                <p className="text-xs text-muted-foreground">{userRole}</p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-11 w-11 rounded-full border-border/70 bg-card text-card-foreground shadow-sm hover:shadow-md"
                  >
                    <span className="font-bold">{userInitial}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center gap-3 px-2 py-3 text-sm">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                      <User size={18} />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <p className="font-semibold">{userDisplayName}</p>
                      <p className="text-xs text-muted-foreground">{userRole}</p>
                    </div>
                  </div>
                  <div className="border-t border-border/60" />
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: `/${locale}/login` })}>
                    <LogOut size={16} className="mr-2" />
                    {tShell("signOut")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-5 py-8 md:px-8">
          <div className="mx-auto w-full max-w-7xl space-y-8">
            {topSlot ?? null}
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
