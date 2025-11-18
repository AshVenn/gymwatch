'use client'

import { ReactNode, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { UserRole } from '@prisma/client'
import type { LucideIcon } from 'lucide-react'
import { LogOut, Menu, X } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'

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
    toast.error('Votre abonnement est suspendu ou expiré. Merci de contacter le support.')
    signOut({ callbackUrl: '/login' })
  }, [status, subscriptionPastDue])

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-lg font-semibold text-muted-foreground">Chargement…</p>
      </div>
    )
  }

  if (!session?.user || (allowedRoles?.length && !isAllowed)) {
    return null
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {sidebarOpen ? (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 border-r border-sidebar-border bg-sidebar/95 text-sidebar-foreground shadow-xl transition-transform md:relative md:translate-x-0 md:shadow-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-sidebar-border/70 px-6 py-5">
            <div className="flex items-center gap-3">
              <Image src="/GymWatch.svg" alt="GymWatch" width={44} height={44} priority className="rounded-lg" />
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-sidebar-foreground/70">GymWatch</p>
                <p className="text-base font-semibold text-sidebar-foreground">Console</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-md border border-sidebar-border/70 p-1 text-sidebar-foreground/70 transition hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:hidden"
              aria-label="Fermer le menu latéral"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 space-y-1 p-4">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-4 py-2 text-sm transition',
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-sidebar-border/70 p-4">
            <Button
              variant="ghost"
              className="w-full justify-start rounded-lg border border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={() => signOut()}
            >
              <LogOut size={18} className="mr-3" />
              Se déconnecter
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-border/60 bg-background/80 px-6 py-4 backdrop-blur supports-backdrop-filter:bg-background/60">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-full border border-border/80 p-2 text-muted-foreground transition hover:bg-muted/70 md:hidden"
            aria-label="Ouvrir le menu latéral"
          >
            <Menu size={22} />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <span className="hidden rounded-full border border-border/70 px-4 py-2 text-xs uppercase tracking-[0.3em] text-muted-foreground md:inline-flex">
              {session.user.email}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="h-10 w-10 rounded-full border-border/70 bg-card text-card-foreground">
                  {session.user.name?.charAt(0).toUpperCase()}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => signOut()}>
                  Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-background px-6 py-8">
          <div className="space-y-6">
            {topSlot}
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
