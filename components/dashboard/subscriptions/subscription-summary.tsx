'use client'

import { useLocale, useTranslations } from 'next-intl'
import { Sparkles, TrendingUp, Users, AlertTriangle, Shield } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export type SubscriptionSummaryMetrics = {
  totalRevenue: number
  avgTicket: number
  active: number
  retentionRate: number
  expiringSoon: number
  expired: number
}

export function SubscriptionSummary({ metrics }: { metrics: SubscriptionSummaryMetrics }) {
  const locale = useLocale()
  const t = useTranslations('subscriptions.summary')
  const isRTL = locale === 'ar'

  const revenueFormatter = new Intl.NumberFormat(
    locale === 'fr' ? 'fr-MA' : locale,
    {
      style: 'currency',
      currency: 'MAD',
      maximumFractionDigits: 0,
    },
  )

  const cards = [
    {
      key: 'totalRevenue',
      label: t('totalRevenue.label'),
      value: revenueFormatter.format(metrics.totalRevenue),
      helper: t('totalRevenue.helper', {
        avgTicket: revenueFormatter.format(metrics.avgTicket || 0),
      }),
      Icon: TrendingUp,
    },
    {
      key: 'active',
      label: t('active.label'),
      value: metrics.active,
      helper: t('active.helper', {
        retentionRate: metrics.retentionRate ?? 0,
      }),
      Icon: Users,
    },
    {
      key: 'expiringSoon',
      label: t('expiringSoon.label'),
      value: metrics.expiringSoon,
      helper: t('expiringSoon.helper'),
      Icon: AlertTriangle,
    },
    {
      key: 'expired',
      label: t('expired.label'),
      value: metrics.expired,
      helper: t('expired.helper'),
      Icon: Shield,
    },
  ]

  return (
    <section
      className="space-y-6 rounded-3xl border border-border/70 bg-card p-6 shadow-sm"
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {t('eyebrow')}
          </p>
          <h1 className="mt-2 text-3xl font-semibold">{t('title')}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {t('description')}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          {t('liveBadge')}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card
            key={card.key}
            className="border-border/60 bg-secondary/40 text-secondary-foreground"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardDescription>{card.label}</CardDescription>
              <card.Icon className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent>
              <CardTitle className="text-3xl">{card.value}</CardTitle>
              <p className="text-sm text-muted-foreground">{card.helper}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
