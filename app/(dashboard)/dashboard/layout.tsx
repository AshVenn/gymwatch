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

const navigationItems: NavigationItem[] = [
  { href: '/dashboard', label: 'Tableau de bord', icon: LayoutGrid },
  { href: '/dashboard/members', label: 'Membres', icon: Users },
  { href: '/dashboard/access-logs', label: 'Acces', icon: KeyRound },
  { href: '/dashboard/presence', label: 'Presence', icon: Activity },
  { href: '/dashboard/classes', label: 'Cours', icon: CalendarClock },
  { href: '/dashboard/subscriptions', label: 'Abonnements', icon: Calendar },
  { href: '/dashboard/plans', label: "Plans d'abonnement", icon: Layers },
  { href: '/dashboard/settings', label: 'Parametres', icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { tier, hasAccessControl, hasPresence, hasCourses, hasExcelReports } = usePlanFeatures()
  const planLabel = tier === 'COMPLEX' ? 'Complex' : tier === 'PRO' ? 'Pro' : 'Basic'
  const featureCards = buildFeatureAccessItems({
    hasAccessControl,
    hasPresence,
    hasCourses,
    hasExcelReports,
  })

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
