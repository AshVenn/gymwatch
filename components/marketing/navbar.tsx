'use client'

import {useEffect, useMemo, useState, useTransition} from 'react'
import Image from 'next/image'
import {useSession, signOut} from 'next-auth/react'
import {Check, Globe2, LayoutDashboard, LogOut, Menu, User, X} from 'lucide-react'
import {useLocale} from 'next-intl'

import {Button} from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {ThemeToggle} from '@/components/theme-toggle'
import {Link, getPathname, routing, usePathname, useRouter, type AppLocale} from '@/i18n/routing'
import {getMarketingCopy, getMarketingNavLinks} from '@/lib/marketing-content'
import {cn} from '@/lib/utils'

type NavLink = {
  label: string
  href: string
}

interface MarketingNavbarProps {
  links?: NavLink[]
  className?: string
}

export function MarketingNavbar({links = [], className}: MarketingNavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const locale = useLocale() as AppLocale
  const {data: session} = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const [isPending, startTransition] = useTransition()

  const localeCopy = getMarketingCopy(locale)
  const computedLinks = links.length
    ? links
    : getMarketingNavLinks(locale, {useHomeAnchors: pathname === '/' || pathname === ''})

  const localeOptions = useMemo(
    () =>
      routing.locales.map((code) => ({
        code,
        label: getMarketingCopy(code).localeLabel,
      })),
    [],
  )

  const authCopy = useMemo(() => {
    if (locale === 'en') {
      return {
        login: 'Sign in',
        requestDemo: localeCopy.hero.home.primaryCta,
        dashboard: 'Go to dashboard',
        signOut: 'Sign out',
      }
    }

    if (locale === 'ar') {
      return {
        login: 'تسجيل الدخول',
        requestDemo: localeCopy.hero.home.primaryCta,
        dashboard: 'الانتقال إلى اللوحة',
        signOut: 'تسجيل الخروج',
      }
    }

    return {
      login: 'Se connecter',
      requestDemo: localeCopy.hero.home.primaryCta,
      dashboard: 'Aller au dashboard',
      signOut: 'Se déconnecter',
    }
  }, [locale, localeCopy.hero.home.primaryCta])

  const dashboardRoute = useMemo(() => {
    if (!session?.user?.role) return '/dashboard'
    return session.user.role === 'SUPER_ADMIN' ? '/super-admin' : '/dashboard'
  }, [session?.user?.role])

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 24)
    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isAuthPage =
    pathname === '/login' || pathname === '/register' || (pathname ? pathname.startsWith('/request-demo') : false)

  const handleLocaleChange = (targetLocale: AppLocale) => {
    if (targetLocale === locale) return
    const target = getPathname({locale: targetLocale, href: pathname || '/'})
    setMenuOpen(false)
    startTransition(() => {
      router.replace(target)
      router.refresh()
    })
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-40 border-b border-border/30',
        isScrolled
          ? 'bg-background/80 shadow-sm supports-[backdrop-filter]:bg-background/70 supports-[backdrop-filter]:backdrop-blur'
          : 'bg-background/40 supports-[backdrop-filter]:bg-background/70 supports-[backdrop-filter]:backdrop-blur',
        className,
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Link href="/" className="group flex items-center gap-3 transition-transform hover:scale-105">
          <div className="relative overflow-hidden rounded-lg">
            <Image
              src="/GymWatch.svg"
              alt="GymWatch"
              width={48}
              height={48}
              priority
              className="transition-transform duration-500 group-hover:scale-110"
            />
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">GymWatch</p>
            <p className="text-sm font-semibold">{localeCopy.brandTagline}</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          {computedLinks.map((link) => (
            <Link key={link.href} href={link.href} className="relative transition hover:text-foreground group">
              {link.label}
              <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 rounded-full border border-border/60 px-3">
                <Globe2 className="h-4 w-4" aria-hidden />
                <span className="text-sm font-semibold">{localeCopy.localeLabel}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {localeOptions.map((option) => (
                <DropdownMenuItem
                  key={option.code}
                  onClick={() => handleLocaleChange(option.code)}
                  className="flex items-center justify-between"
                >
                  <span>{option.label}</span>
                  {option.code === locale && <Check className="h-4 w-4 text-primary" aria-hidden />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 rounded-full border-border/70 bg-card px-3">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-semibold">{session.user.email ?? 'Mon compte'}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => router.push(dashboardRoute)}>
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  {authCopy.dashboard}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut({callbackUrl: '/'})}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {authCopy.signOut}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" onClick={() => router.push('/login')} className="transition hover:text-primary">
                {authCopy.login}
              </Button>
              {!isAuthPage && (
                <Button onClick={() => router.push('/request-demo')} className="transition hover:scale-105 hover:shadow-lg">
                  {authCopy.requestDemo}
                </Button>
              )}
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen(true)} aria-label="Ouvrir le menu">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-border/60 bg-background md:hidden animate-in slide-in-from-top">
          <div className="flex items-center justify-between px-4 py-3">
            <p className="text-sm font-medium">Navigation</p>
            <Button variant="ghost" size="icon" onClick={() => setMenuOpen(false)} aria-label="Fermer le menu">
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="space-y-2 px-4 pb-4">
            {computedLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg border border-border/60 px-4 py-2 text-sm transition hover:bg-primary/10"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            <div className="flex items-center justify-between rounded-lg border border-border/60 px-4 py-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Globe2 className="h-4 w-4" aria-hidden />
                <span>{localeCopy.localeLabel}</span>
              </div>
              <div className="flex items-center gap-1">
                {localeOptions.map((option) => (
                  <Button
                    key={option.code}
                    size="sm"
                    variant={option.code === locale ? 'secondary' : 'ghost'}
                    onClick={() => handleLocaleChange(option.code)}
                    disabled={isPending}
                  >
                    {option.code.toUpperCase()}
                  </Button>
                ))}
              </div>
            </div>

            {!session?.user ? (
              <>
                <Button className="w-full transition hover:scale-105" onClick={() => router.push('/request-demo')}>
                  {authCopy.requestDemo}
                </Button>
                <Button variant="ghost" className="w-full transition hover:text-primary" onClick={() => router.push('/login')}>
                  {authCopy.login}
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="w-full transition hover:scale-105"
                  onClick={() => {
                    router.push(dashboardRoute)
                    setMenuOpen(false)
                  }}
                >
                  {authCopy.dashboard}
                </Button>
                <Button
                  variant="outline"
                  className="w-full transition"
                  onClick={() => {
                    setMenuOpen(false)
                    signOut({callbackUrl: '/'})
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
