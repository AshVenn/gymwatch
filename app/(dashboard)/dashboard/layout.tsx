'use client'
//(dashboard)/dashboard/layout.tsx
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LayoutGrid, Users, Calendar, Layers, Settings, LogOut, Menu, X } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold">Chargement...</div>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const navigationItems = [
    { href: '/dashboard', label: 'Tableau de bord', icon: LayoutGrid },
    { href: '/dashboard/members', label: 'Membres', icon: Users },
    { href: '/dashboard/subscriptions', label: 'Abonnements', icon: Calendar },
    { href: '/dashboard/plans', label: 'Plans d\'abonnement', icon: Layers },
    { href: '/dashboard/settings', label: 'Paramètres', icon: Settings },
  ]

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform md:relative md:translate-x-0`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-700 p-6 flex justify-between items-center">
            <h1 className="text-2xl font-bold">GymWatch</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden"
            >
              <X size={24} />
            </button>
          </div>
          <nav className="flex-1 space-y-2 p-4">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
          <div className="border-t border-slate-700 p-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-slate-300 hover:bg-slate-800 hover:text-white"
              onClick={() => signOut()}
            >
              <LogOut size={20} className="mr-3" />
              Se déconnecter
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-slate-200 bg-white px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-4 ml-auto">
            <span className="text-sm text-muted-foreground">
              {session.user?.email}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-full w-10 h-10 p-0">
                  {session.user?.name?.charAt(0).toUpperCase()}
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

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
