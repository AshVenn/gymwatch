'use client'

import { BarChart3, Building, ShieldCheck } from 'lucide-react'
import { DashboardShell, NavigationItem } from '@/components/dashboard/dashboard-shell'
import { UserRole } from '@prisma/client'

const navigationItems: NavigationItem[] = [
  { href: '/super-admin', label: 'Vue d’ensemble', icon: BarChart3 },
  { href: '/super-admin/gyms', label: 'Gestion des salles', icon: Building },
  { href: '/dashboard', label: 'Basculer vers une salle', icon: ShieldCheck },
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
