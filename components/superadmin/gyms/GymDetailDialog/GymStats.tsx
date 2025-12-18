'use client'

import type { SuperAdminGymDetail } from '@/app/[locale]/(dashboard)/super-admin/hooks'
import { useLocale, useTranslations } from 'next-intl'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

type Props = {
  gym: SuperAdminGymDetail
}

export function GymStats({ gym }: Props) {
  const t = useTranslations('superAdminGymStats')
  const locale = useLocale()

  const MAD = new Intl.NumberFormat(locale === 'ar' ? 'ar-MA' : 'fr-MA', {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 0,
  })

  const cards = [
    {
      key: 'members',
      value: gym.memberCount ?? 0,
      helper: t('members.helper'),
      title: t('members.title'),
    },
    {
      key: 'activeSubscriptions',
      value: gym.activeSubscriptions ?? 0,
      helper: t('activeSubscriptions.helper'),
      title: t('activeSubscriptions.title'),
    },
    {
      key: 'earningsMonth',
      value: MAD.format(gym.paymentsCurrentMonth ?? gym.paymentsLast30Days ?? 0),
      helper: t('earningsMonth.helper'),
      title: t('earningsMonth.title'),
    },
    {
      key: 'earningsLifetime',
      value: MAD.format(gym.paymentsTotal ?? gym.paymentsLast30Days ?? 0),
      helper: t('earningsLifetime.helper'),
      title: t('earningsLifetime.title'),
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.key} className="h-full">
          <CardHeader className="pb-2">
            <CardDescription>{card.title}</CardDescription>
            <CardTitle className="text-3xl">{card.value}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{card.helper}</CardContent>
        </Card>
      ))}
    </div>
  )
}
