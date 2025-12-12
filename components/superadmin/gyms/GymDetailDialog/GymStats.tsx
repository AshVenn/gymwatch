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

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardDescription>{t('members.title')}</CardDescription>
          <CardTitle className="text-3xl">{gym.memberCount ?? 0}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t('members.helper')}
        </CardContent>
      </Card>

      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardDescription>{t('activeSubscriptions.title')}</CardDescription>
          <CardTitle className="text-3xl">{gym.activeSubscriptions ?? 0}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t('activeSubscriptions.helper')}
        </CardContent>
      </Card>

      <Card className="h-full sm:col-span-2 lg:col-span-1">
        <CardHeader className="pb-2">
          <CardDescription>{t('revenue30d.title')}</CardDescription>
          <CardTitle className="text-3xl">{MAD.format(gym.paymentsLast30Days ?? 0)}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          {t('revenue30d.helper')}
        </CardContent>
      </Card>
    </div>
  )
}
