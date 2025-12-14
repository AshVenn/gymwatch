"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import type { ComponentProps } from "react"
import Image from "next/image"
import { useSession, signOut } from "next-auth/react"
import { Check, Globe2, LayoutDashboard, LogOut, Menu, User, X } from "lucide-react"
import { useLocale } from "next-intl"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import { Link, routing, usePathname, useRouter, type AppLocale } from "@/i18n/routing"
import { getMarketingCopy, getMarketingNavLinks } from "@/lib/marketing-content"
import { cn } from "@/lib/utils"

// Infer the correct href type from next-intl's Link
type LinkHref = ComponentProps<typeof Link>["href"]

type NavLink = {
  label: string
  href: LinkHref
}

interface MarketingNavbarProps {
  links?: NavLink[]
  className?: string
}

const LOCALE_ABBREVIATIONS: Record<AppLocale, string> = {
  en: "EN",
  fr: "FR",
  ar: "AR",
}

export function MarketingNavbar({ links = [], className }: MarketingNavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale() as AppLocale
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isPending, startTransition] = useTransition()

  const localeCopy = getMarketingCopy(locale)

  const computedLinks: NavLink[] = links.length
    ? links
    : [
        ...(getMarketingNavLinks(locale, {
          useHomeAnchors: pathname === "/",
        }) as NavLink[]),
        { label: localeCopy.nav?.about || "About", href: "/about" as LinkHref },
      ]

  const localeOptions = useMemo(
    () =>
      routing.locales.map((code) => ({
        code,
        label: getMarketingCopy(code).localeLabel,
      })),
    [],
  )

  const authCopy = useMemo(() => {
    if (locale === "en") {
      return {
        login: "Sign in",
        requestDemo: localeCopy.hero.home.primaryCta,
        dashboard: "Go to dashboard",
        signOut: "Sign out",
      }
    }

    if (locale === "ar") {
      return {
        login: "تسجيل الدخول",
        requestDemo: localeCopy.hero.home.primaryCta,
        dashboard: "الانتقال إلى اللوحة",
        signOut: "تسجيل الخروج",
      }
    }

    return {
      login: "Se connecter",
      requestDemo: localeCopy.hero.home.primaryCta,
      dashboard: "Aller au dashboard",
      signOut: "Se déconnecter",
    }
  }, [locale, localeCopy.hero.home.primaryCta])

  const dashboardRoute: LinkHref = useMemo(() => {
    if (!session?.user?.role) return "/dashboard"
    return session.user.role === "SUPER_ADMIN" ? "/super-admin" : "/dashboard"
  }, [session?.user?.role])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24)
    handleScroll()
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const isAuthPage =
    pathname === "/login" || pathname === "/register" || (pathname ? pathname.startsWith("/request-demo") : false)

  const stripLocale = (path: string) => {
    const raw = path || "/"
    return routing.locales.reduce((current, code) => {
      const prefix = `/${code}`
      if (current === prefix) return "/"
      if (current.startsWith(`${prefix}/`)) return current.slice(prefix.length) || "/"
      return current
    }, raw)
  }

  const handleLocaleChange = (targetLocale: AppLocale) => {
    if (targetLocale === locale) return

    const rawPath = pathname || "/"
    const cleanPath = stripLocale(rawPath) || "/"

    setMenuOpen(false)

    startTransition(() => {
      router.replace({ pathname: cleanPath as any }, { locale: targetLocale })
      router.refresh()
    })
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b",
        isScrolled
          ? "border-border/50 bg-background/95 shadow-md backdrop-blur-xl supports-backdrop-filter:bg-background/80"
          : "border-border/30 bg-background/60 backdrop-blur-lg supports-backdrop-filter:bg-background/50",
        "transition-all duration-300",
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="group flex items-center gap-3 transition-transform hover:scale-105">
          <div className="relative overflow-hidden rounded-xl ring-2 ring-primary/10 transition-all duration-300 group-hover:ring-primary/30 group-hover:shadow-lg">
            <Image
              src="/GymWatch.svg"
              alt="GymWatch"
              width={48}
              height={48}
              priority
              className="transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3 dark:invert dark:brightness-200"
            />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground transition-colors group-hover:text-primary">
              GymWatch
            </p>
            <p className="text-sm font-semibold transition-colors group-hover:text-primary">
              {localeCopy.brandTagline}
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted-foreground md:flex">
          {computedLinks.map((link) => (
            <Link
              key={String(link.href)}
              href={link.href}
              className="group relative py-2 transition-colors hover:text-foreground"
            >
              {link.label}
              <span className="absolute bottom-0 left-0 h-0.5 w-0 rounded-full bg-linear-to-r from-primary to-primary/60 transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 rounded-xl border border-border/60 px-3 transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-sm"
              >
                <Globe2 className="h-4 w-4" aria-hidden />
                <span className="text-sm font-bold tracking-wider">{LOCALE_ABBREVIATIONS[locale]}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 border-border/70 rounded-xl">
              {localeOptions.map((option) => (
                <DropdownMenuItem
                  key={option.code}
                  onClick={() => handleLocaleChange(option.code)}
                  className="flex items-center justify-between transition-colors rounded-lg"
                >
                  <span className="font-medium">{option.label}</span>
                  {option.code === locale && <Check className="h-4 w-4 text-primary" aria-hidden />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 rounded-xl border-border/70 bg-card/50 px-3 transition-all hover:border-primary/40 hover:bg-card hover:shadow-md"
                >
                  <User className="h-4 w-4" />
                  <span className="text-sm font-semibold max-w-[120px] truncate">
                    {session.user.email ?? "Account"}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 border-border/70 rounded-xl">
                <DropdownMenuItem onClick={() => router.push(dashboardRoute)} className="transition-colors rounded-lg">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  {authCopy.dashboard}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="transition-colors rounded-lg text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {authCopy.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/login")}
                className="transition-all hover:text-primary hover:scale-105 rounded-xl"
              >
                {authCopy.login}
              </Button>
              {!isAuthPage && (
                <Button
                  size="sm"
                  onClick={() => router.push("/request-demo")}
                  className="shadow-md transition-all hover:scale-105 hover:shadow-lg rounded-xl"
                >
                  {authCopy.requestDemo}
                </Button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className="rounded-xl"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="animate-in slide-in-from-top-2 border-t border-border/60 bg-background/95 backdrop-blur-xl md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-semibold">Navigation</p>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="rounded-xl"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="space-y-2 px-4 pb-4">
            {computedLinks.map((link) => (
              <Link
                key={String(link.href)}
                href={link.href}
                className="block rounded-xl border border-border/60 px-4 py-2.5 text-sm font-medium transition-all hover:border-primary/40 hover:bg-primary/10"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            <div className="flex items-center justify-between rounded-xl border border-border/60 px-4 py-2.5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Globe2 className="h-4 w-4" aria-hidden />
                <span>{LOCALE_ABBREVIATIONS[locale]}</span>
              </div>
              <div className="flex items-center gap-1">
                {localeOptions.map((option) => (
                  <Button
                    key={option.code}
                    size="sm"
                    variant={option.code === locale ? "secondary" : "ghost"}
                    onClick={() => handleLocaleChange(option.code)}
                    disabled={isPending}
                    className="h-8 px-2.5 text-xs font-bold rounded-lg"
                  >
                    {LOCALE_ABBREVIATIONS[option.code]}
                  </Button>
                ))}
              </div>
            </div>

            {!session?.user ? (
              <>
                <Button
                  className="w-full transition hover:scale-105 rounded-xl"
                  onClick={() => router.push("/request-demo")}
                >
                  {authCopy.requestDemo}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full transition hover:text-primary rounded-xl"
                  onClick={() => router.push("/login")}
                >
                  {authCopy.login}
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="w-full transition hover:scale-105 rounded-xl"
                  onClick={() => {
                    router.push(dashboardRoute)
                    setMenuOpen(false)
                  }}
                >
                  {authCopy.dashboard}
                </Button>
                <Button
                  variant="outline"
                  className="w-full transition bg-transparent rounded-xl"
                  onClick={() => {
                    setMenuOpen(false)
                    signOut({ callbackUrl: "/" })
                  }}
                >
                  {authCopy.signOut}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
