'use client'

import {
  Activity,
  Calendar,
  CalendarClock,
  KeyRound,
  Layers,
  LayoutGrid,
  Settings,
  Users,
} from 'lucide-react'
import { usePlanFeatures } from '@/app/hooks/use-plan-features'
import { DashboardShell, NavigationItem, UserRole } from '@/components/dashboard/dashboard-shell'
import { FeatureAccessGrid, buildFeatureAccessItems } from '@/components/dashboard/feature-access-grid'
import { SubscriptionBanner } from '@/components/dashboard/subscription-banner'
import { useTranslations } from 'next-intl'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tNav = useTranslations('dashboard.nav')
  const { tier, hasAccessControl, hasPresence, hasCourses, hasExcelReports } = usePlanFeatures()
  const planLabel = tier === 'ENTERPRISE' ? 'Enterprise' : tier === 'PRO' ? 'Pro' : 'Basic'
  const featureCards = buildFeatureAccessItems({
    hasAccessControl,
    hasPresence,
    hasCourses,
    hasExcelReports,
  })
  const navigationItems: NavigationItem[] = [
    { href: '/dashboard', label: tNav('dashboard'), icon: LayoutGrid },
    { href: '/dashboard/members', label: tNav('members'), icon: Users },
    { href: '/dashboard/access-logs', label: tNav('accessLogs'), icon: KeyRound },
    { href: '/dashboard/presence', label: tNav('presence'), icon: Activity },
    { href: '/dashboard/classes', label: tNav('classes'), icon: CalendarClock },
    { href: '/dashboard/subscriptions', label: tNav('subscriptions'), icon: Calendar },
    { href: '/dashboard/plans', label: tNav('plans'), icon: Layers },
    { href: '/dashboard/settings', label: tNav('settings'), icon: Settings },
  ]

  return (
    <DashboardShell
      navigationItems={navigationItems}
      allowedRoles={[UserRole.GYM_ADMIN, UserRole.GYM_OWNER]}
      fallbackRoute="/super-admin"
      topSlot={
        <div className="space-y-4">
          <SubscriptionBanner />
          <FeatureAccessGrid items={featureCards} planLabel={planLabel} />
        </div>
      }
    >
      {children}
    </DashboardShell>
  )
}
