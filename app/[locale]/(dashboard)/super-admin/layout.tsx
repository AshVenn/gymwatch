'use client'

import type { ReactNode } from 'react'
import { BarChart3, Building, Inbox, Settings } from 'lucide-react'
import { useTranslations } from 'next-intl'

import { DashboardShell, type NavigationItem, UserRole } from '@/components/dashboard/dashboard-shell'

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('superAdminLayout')

  const navigationItems: NavigationItem[] = [
    { href: '/super-admin', label: t('nav.overview'), icon: BarChart3 },
    { href: '/super-admin/gyms', label: t('nav.gyms'), icon: Building },
    { href: '/super-admin/demo-requests', label: t('nav.demoRequests'), icon: Inbox },
    { href: '/super-admin/settings', label: t('nav.settings'), icon: Settings },
  ]

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
