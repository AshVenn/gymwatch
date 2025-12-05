'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Menu, X, LayoutDashboard, LogOut, User } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'

type NavLink = {
  label: string
  href: string
}

interface MarketingNavbarProps {
  links?: NavLink[]
  className?: string
}

export function MarketingNavbar({ links = [], className }: MarketingNavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { data: session } = useSession()
  const [menuOpen, setMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)

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

  const baseLinks: NavLink[] = links.length
    ? links
    : [
        { label: 'Fonctionnalités', href: '#features' },
        { label: "Plans", href: '#plans' },
        { label: 'FAQs', href: '/faqs' },
        { label: 'Contact', href: '#contact' },
      ]

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
            <p className="text-sm font-semibold">Gestion moderne des salles</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
          {baseLinks.map((link) => (
            <Link key={link.href} href={link.href} className="relative transition hover:text-foreground group">
              {link.label}
              <span className="absolute bottom-0 left-0 h-0.5 w-0 bg-primary transition-all duration-300 group-hover:w-full" />
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />

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
                  Tableau de bord
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: '/' })}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" onClick={() => router.push('/login')} className="transition hover:text-primary">
                Se connecter
              </Button>
              {!isAuthPage && (
                <Button onClick={() => router.push('/request-demo')} className="transition hover:scale-105 hover:shadow-lg">
                  Demander une démo
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
            {baseLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="block rounded-lg border border-border/60 px-4 py-2 text-sm transition hover:bg-primary/10"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {!session?.user ? (
              <>
                <Button className="w-full transition hover:scale-105" onClick={() => router.push('/request-demo')}>
                  Demander une démo
                </Button>
                <Button variant="ghost" className="w-full transition hover:text-primary" onClick={() => router.push('/login')}>
                  Se connecter
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
                  Aller au dashboard
                </Button>
                <Button
                  variant="outline"
                  className="w-full transition"
                  onClick={() => {
                    setMenuOpen(false)
                    signOut({ callbackUrl: '/' })
                  }}
                >
                  Se déconnecter
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
