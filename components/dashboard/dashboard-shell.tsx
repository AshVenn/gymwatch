'use client'

import { ReactNode, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import { ChevronRight, LogOut, Menu, ShieldCheck, User, X } from 'lucide-react'
import { toast } from 'sonner'
import { useLocale, useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
// ⛔️ removed: import { ScrollArea } from '@/components/ui/scroll-area'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  GYM_OWNER: 'GYM_OWNER',
  GYM_ADMIN: 'GYM_ADMIN',
} as const

export type UserRole = (typeof UserRole)[keyof typeof UserRole]

export type NavigationItem = {
  href: string
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
  fallbackRoute = '/login',
  topSlot,
}: DashboardShellProps) {
  const locale = useLocale()
  const tShell = useTranslations('dashboard.shell')
  const isRtl = locale === 'ar'
  const { data: session, status } = useSession()
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isAllowed = useMemo(() => {
    if (!allowedRoles?.length) return true
    const userRole = session?.user?.role
    return userRole ? allowedRoles.includes(userRole as UserRole) : false
  }, [allowedRoles, session?.user?.role])

  const subscriptionPastDue = useMemo(() => {
    if (!session?.user) return false
    const userRole = session.user.role as UserRole
    if (userRole === UserRole.SUPER_ADMIN) return false
    if (session.user.subscriptionStatus === 'EXPIRED' || session.user.subscriptionStatus === 'SUSPENDED') return true
    const expiresAt = session.user.subscriptionExpiresAt
    if (!expiresAt) return false
    const parsed = new Date(expiresAt)
    if (Number.isNaN(parsed.getTime())) return false
    return parsed.getTime() < Date.now()
  }, [session?.user])

  useEffect(() => {
    if (status === 'loading') return
    if (status === 'unauthenticated' || !session?.user) {
      router.replace('/login')
      return
    }

    if (allowedRoles?.length && !isAllowed) {
      router.replace(fallbackRoute)
    }
  }, [allowedRoles, fallbackRoute, isAllowed, router, session?.user, status])

  useEffect(() => {
    if (!subscriptionPastDue || status !== 'authenticated') return
    toast.error(tShell('subscriptionExpired'))
    signOut({ callbackUrl: '/login' })
  }, [status, subscriptionPastDue, tShell])

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg font-semibold text-muted-foreground">{tShell('loading')}</p>
      </div>
    )
  }

  if (!session?.user || (allowedRoles?.length && !isAllowed)) {
    return null
  }

  const roleLabels: Record<string, string> = {
    SUPER_ADMIN: tShell('roles.superAdmin'),
    ADMIN: tShell('roles.admin'),
    OWNER: tShell('roles.owner'),
    USER: tShell('roles.user'),
    GYM_ADMIN: tShell('roles.admin'),
    GYM_OWNER: tShell('roles.owner'),
  }

  const userDisplayName = session.user.name || session.user.email || tShell('userFallback')
  const userRole = roleLabels[session.user.role as string] || session.user.role || tShell('userFallback')
  const userInitial = userDisplayName.charAt(0).toUpperCase()
  const isDemoGym = Boolean((session.user as any).isDemo)
  const planLabel = (session.user as any)?.subscriptionPlan ?? tShell('planLabel')
  const billingIntervalRaw = (session.user as any)?.billingInterval
  const billingInterval =
    billingIntervalRaw === 'ANNUAL'
      ? tShell('billing.annual')
      : billingIntervalRaw === 'MONTHLY'
        ? tShell('billing.monthly')
        : tShell('billing.generic')

  return (
    <div className={cn('relative flex min-h-screen bg-background text-foreground', isRtl && 'md:flex-row-reverse')}>
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_14%_18%,hsl(var(--primary)/0.12),transparent_28%),radial-gradient(circle_at_70%_10%,hsl(var(--muted-foreground)/0.06),transparent_24%)]" />

      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 z-50 h-full w-64 overflow-y-auto border-r border-border/60 bg-card/95 text-card-foreground shadow-xl backdrop-blur-xl transition-transform duration-300 md:translate-x-0',
          isRtl ? 'right-0 left-auto border-l border-r-0' : 'left-0',
          // hide native scrollbar in the whole aside
          '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
          sidebarOpen ? 'translate-x-0' : isRtl ? 'translate-x-full' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
            <div className="flex items-center gap-3">
              <Image src="/GymWatch.svg" alt="GymWatch" width={44} height={44} className="rounded-xl" priority />
              <div className="leading-tight">
                <p className="text-[11px] uppercase tracking-[0.26em] text-muted-foreground">GymWatch</p>
                <p className="text-base font-semibold">{tShell('console')}</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg border border-border/60 p-1.5 text-muted-foreground transition hover:bg-muted md:hidden"
              aria-label={tShell('closeMenu')}
            >
              <X size={18} />
            </button>
          </div>

          {/* Sidebar scrollable area WITHOUT visible scrollbar */}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            <div className="space-y-5 px-4 py-5">
              <nav className="space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition',
                        isActive
                          ? 'border-primary/40 bg-primary/5 text-foreground shadow-sm'
                          : 'border-transparent text-muted-foreground hover:border-border/60 hover:bg-muted/60 hover:text-foreground',
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <div
                        className={cn(
                          'flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-muted/50 text-muted-foreground transition group-hover:border-primary/40 group-hover:text-primary',
                          isActive && 'border-primary/40 bg-primary/10 text-primary',
                        )}
                      >
                        <Icon size={18} />
                      </div>
                      <div className="flex-1">{item.label}</div>
                      <ChevronRight
                        size={16}
                        className={cn(
                          'text-muted-foreground transition',
                          isActive ? 'translate-x-1 text-primary' : 'group-hover:translate-x-1',
                        )}
                      />
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>

          <div className="border-t border-border/60 px-4 py-4">
            <div className="mb-3 flex items-center gap-3 rounded-2xl border border-border/60 bg-muted/50 px-3 py-2">
              <Image src="/GymWatch.svg" alt="GymWatch" width={42} height={42} className="rounded-xl" />
              <div className="flex-1">
                <p className="text-sm font-semibold">{userDisplayName}</p>
                <p className="text-xs text-muted-foreground">{userRole}</p>
              </div>
              {isDemoGym ? (
                <Badge variant="outline" className="rounded-full border-amber-200 bg-amber-50 text-amber-800">
                  {tShell('demoBadge')}
                </Badge>
              ) : null}
            </div>
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5 font-semibold text-foreground">
                  <ShieldCheck size={14} /> {planLabel}
                </span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] uppercase tracking-[0.22em]">
                  {billingInterval}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-border/70 bg-background text-foreground hover:bg-muted"
                onClick={() => signOut()}
              >
                <LogOut size={16} className="mr-2" />
                {tShell('exit')}
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* main content, offset by sidebar width on md+ */}
      <div
        className={cn(
          'flex flex-1 flex-col overflow-hidden transition-all',
          isRtl ? 'md:pr-64 md:pl-0' : 'md:pl-64',
        )}
      >
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 px-4 py-3 backdrop-blur-lg md:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="rounded-xl border-border/60 bg-card text-muted-foreground hover:text-foreground md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label={tShell('openMenu')}
            >
              <Menu size={18} />
            </Button>

            <div className="ml-auto flex items-center gap-2 md:gap-3">
              <ThemeToggle />

              <div className="hidden flex-col items-end md:flex">
                <p className="text-sm font-semibold text-foreground">{userDisplayName}</p>
                <p className="text-xs text-muted-foreground">{userRole}</p>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-10 w-10 rounded-full border-border/70 bg-card text-card-foreground shadow-sm"
                  >
                    {userInitial}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="flex items-center gap-3 px-2 py-3 text-sm">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                      <User size={16} className="text-primary" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <p className="font-semibold">{userDisplayName}</p>
                      <p className="text-xs text-muted-foreground">{userRole}</p>
                    </div>
                  </div>
                  <div className="border-t border-border/60" />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut size={16} className="mr-2" />
                    {tShell('signOut')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto px-4 py-6 md:px-8">
          <div className="w-full space-y-6">
            {topSlot ? (
              <div className="rounded-2xl border border-border/50 bg-card/90 p-4 shadow-sm backdrop-blur-sm">
                {topSlot}
              </div>
            ) : null}
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
