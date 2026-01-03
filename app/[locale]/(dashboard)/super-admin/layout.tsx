'use client'

import type { ReactNode } from 'react'
import { BarChart3, Building, Handshake, Inbox, Settings, SlidersHorizontal, ShieldCheck, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useSession } from 'next-auth/react'

import { DashboardShell, type NavigationItem, UserRole } from '@/components/dashboard/dashboard-shell'
import { Permissions } from '@/lib/rbac/permissions'
import { hasPermission } from '@/lib/rbac/policies'

export default function SuperAdminLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('superAdminLayout')
  const { data: session } = useSession()
  const role = session?.user?.role as UserRole | undefined

  const navigationItems: Array<NavigationItem & { permission?: string }> = [
    { href: '/super-admin', label: t('nav.overview'), icon: BarChart3, permission: Permissions.PlatformGymsRead },
    { href: '/super-admin/plan-setup', label: t('nav.planSetup'), icon: SlidersHorizontal, permission: Permissions.PlatformPlansManage },
    { href: '/super-admin/gyms', label: t('nav.gyms'), icon: Building, permission: Permissions.PlatformGymsRead },
    { href: '/super-admin/users', label: t('nav.users'), icon: Users, permission: Permissions.PlatformUsersRead },
    { href: '/super-admin/audit', label: t('nav.audit'), icon: ShieldCheck, permission: Permissions.PlatformAuditRead },
    { href: '/super-admin/demo-requests', label: t('nav.demoRequests'), icon: Inbox, permission: Permissions.PlatformDemoRequestsManage },
    { href: '/super-admin/partners', label: t('nav.partners'), icon: Handshake, permission: Permissions.PlatformPartnersManage },
    { href: '/super-admin/settings', label: t('nav.settings'), icon: Settings, permission: Permissions.PlatformSettingsManage },
  ]

  const filteredNavigation = navigationItems.filter((item) =>
    item.permission ? hasPermission(role ?? null, item.permission as any) : true,
  )

  return (
    <DashboardShell
      navigationItems={filteredNavigation}
      allowedRoles={[UserRole.SUPER_ADMIN, UserRole.SUPER_MANAGER]}
      fallbackRoute="/dashboard"
    >
      {children}
    </DashboardShell>
  )
}
