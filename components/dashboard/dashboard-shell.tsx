'use client'

import { ReactNode, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSession, signOut } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { UserRole } from '@prisma/client'
import type { Icon as LucideIcon } from 'lucide-react'
import { LogOut, Menu, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
    const role = session?.user?.role
    return role ? allowedRoles.includes(role as UserRole) : false
  }, [allowedRoles, session?.user?.role])

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

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold">Chargement...</div>
        </div>
      </div>
    )
  }

  if (!session?.user || (allowedRoles?.length && !isAllowed)) {
    return null
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 border-r border-border bg-card shadow-lg transition-transform md:relative md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border/60 p-6">
            <div className="flex items-center gap-2">
              <Image src="/GymWatch.svg" alt="GymWatch" width={32} height={32} priority className="rounded" />
              <span className="text-xl font-semibold">GymWatch</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-md p-1 text-muted-foreground transition hover:bg-muted md:hidden"
            >
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 space-y-2 p-4">
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:bg-muted hover:text-foreground',
                    isActive ? 'bg-muted text-foreground' : 'text-muted-foreground'
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="border-t border-border/60 p-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={() => signOut()}
            >
              <LogOut size={20} className="mr-3" />
              Se déconnecter
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-border bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-md p-2 text-muted-foreground transition hover:bg-muted md:hidden"
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-4 ml-auto">
            <span className="text-sm text-muted-foreground">
              {session?.user?.email}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-full w-10 h-10 p-0">
                  {session?.user?.name?.charAt(0).toUpperCase()}
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

        <main className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {topSlot}
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
