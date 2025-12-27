"use client"

import type React from "react"

import { Activity, Calendar, CalendarClock, KeyRound, Layers, LayoutGrid, QrCode, Settings, Users } from "lucide-react"
import { usePlanFeatures } from "@/app/hooks/use-plan-features"
import { DashboardShell, type NavigationItem, UserRole } from "@/components/dashboard/dashboard-shell"
import { SubscriptionBanner } from "@/components/dashboard/subscription-banner"
import { useTranslations } from "next-intl"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const tNav = useTranslations("dashboard.nav")
  const { tier } = usePlanFeatures()

  const navigationItems: NavigationItem[] = [
    { href: "/dashboard", label: tNav("dashboard"), icon: LayoutGrid },
    { href: "/dashboard/members", label: tNav("members"), icon: Users },
    { href: "/dashboard/badges", label: tNav("badges"), icon: QrCode },
    { href: "/dashboard/subscriptions", label: tNav("subscriptions"), icon: Calendar },
    { href: "/dashboard/access-logs", label: tNav("accessLogs"), icon: KeyRound },
    { href: "/dashboard/presence", label: tNav("presence"), icon: Activity },
    { href: "/dashboard/classes", label: tNav("classes"), icon: CalendarClock },
    { href: "/dashboard/plans", label: tNav("plans"), icon: Layers },
    { href: "/dashboard/settings", label: tNav("settings"), icon: Settings },
  ]

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
