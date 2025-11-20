'use client'

import { BarChart3, Building, Inbox, Settings } from 'lucide-react'
import { DashboardShell, NavigationItem, UserRole } from '@/components/dashboard/dashboard-shell'

const navigationItems: NavigationItem[] = [
  { href: '/super-admin', label: "Vue d'ensemble", icon: BarChart3 },
  { href: '/super-admin/gyms', label: 'Gestion des salles', icon: Building },
  { href: '/super-admin/demo-requests', label: 'Demandes demo', icon: Inbox },
  { href: '/super-admin/settings', label: 'Parametres', icon: Settings },
]

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardShell
      navigationItems={navigationItems}
      allowedRoles={[UserRole.SUPER_ADMIN]}
      fallbackRoute="/dashboard"
    >
      {children}
    </DashboardShell>
  )
}
