'use client'

import { Calendar, Layers, LayoutGrid, Settings, Users } from 'lucide-react'
import { DashboardShell, NavigationItem } from '@/components/dashboard/dashboard-shell'
import { UserRole } from '@prisma/client'
import { SubscriptionBanner } from '@/components/dashboard/subscription-banner'

const navigationItems: NavigationItem[] = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutGrid },
  { href: '/dashboard/members', label: 'Membres', icon: Users },
  { href: '/dashboard/subscriptions', label: 'Abonnements', icon: Calendar },
  { href: '/dashboard/plans', label: "Plans d'abonnement", icon: Layers },
  { href: '/dashboard/settings', label: 'Paramètres', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      navigationItems={navigationItems}
      allowedRoles={[UserRole.GYM_ADMIN, UserRole.GYM_OWNER]}
      fallbackRoute="/super-admin"
      topSlot={<SubscriptionBanner />}
    >
      {children}
    </DashboardShell>
  )
}
