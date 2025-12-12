'use client'

import { useTranslations } from 'next-intl'
import { Building2, Users2, Activity, Gauge } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { SuperAdminGym } from '@/app/[locale]/(dashboard)/super-admin/hooks'

type Props = {
  gyms: SuperAdminGym[]
}

export function GymSummaryCards({ gyms }: Props) {
  const t = useTranslations('superAdminGymSummary')

  const metrics = {
    totalGyms: gyms.length,
    active: gyms.filter((gym) => gym.subscriptionStatus === 'ACTIVE').length,
    suspended: gyms.filter((gym) => gym.subscriptionStatus === 'SUSPENDED').length,
    expired: gyms.filter((gym) => gym.subscriptionStatus === 'EXPIRED').length,
    members: gyms.reduce((sum, gym) => sum + (gym.memberCount ?? 0), 0),
    subs: gyms.reduce((sum, gym) => sum + (gym.activeSubscriptions ?? 0), 0),
  }

  const adminUsage = (() => {
    const used = gyms.reduce((sum, gym) => sum + (gym.adminCount ?? 0), 0)
    const max = gyms.reduce((sum, gym) => sum + (gym.maxAdminAccounts ?? 0), 0)
    return max ? Math.round((used / max) * 100) : 0
  })()

  const cards = [
    {
      key: 'activeGyms',
      value: metrics.active,
      helper: t('helpers.totalGyms', { count: metrics.totalGyms }),
      icon: Building2,
    },
    {
      key: 'members',
      value: metrics.members,
      helper: t('helpers.subscriptions', { count: metrics.subs }),
      icon: Users2,
    },
    {
      key: 'suspended',
      value: metrics.suspended,
      helper: t('helpers.expired', { count: metrics.expired }),
      icon: Activity,
    },
    {
      key: 'adminCapacity',
      value: `${adminUsage}%`,
      helper: t('helpers.adminUsage'),
      icon: Gauge,
    },
  ] as const

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card
          key={card.key}
          className="border-border/60 bg-card text-card-foreground"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>{t(`cards.${card.key}.label`)}</CardDescription>
            <card.icon className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl">{card.value}</CardTitle>
            <p className="text-sm text-muted-foreground">{card.helper}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  )
}
