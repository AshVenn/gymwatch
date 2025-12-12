import type { SuperAdminGymDetail } from '@/app/[locale]/(dashboard)/super-admin/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { useTranslations, useLocale } from 'next-intl'
import { useMemo } from 'react'

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'oklch(0.69 0.22 267.04)',
  SUSPENDED: 'oklch(0.704 0.191 22.216)',
  EXPIRED: 'oklch(0.61 0.16 292.64)',
  EXPIRES_TODAY: 'oklch(0.704 0.191 22.216)',
}

const expiryChartConfig: ChartConfig = {
  value: {
    label: 'Expirations',
    color: STATUS_COLORS.ACTIVE,
  },
}

const statusChartConfig: ChartConfig = {
  value: { label: 'Abonnements' },
}

type Props = {
  gym: SuperAdminGymDetail
}

function safeDate(value?: string | null) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d
}

export function GymAnalytics({ gym }: Props) {
  const t = useTranslations('superAdminGymAnalytics')
  const locale = useLocale()
  const subscriptions = gym.subscriptions ?? []

  const expiryTrend = useMemo(() => {
    const buckets = new Map<string, { label: string; value: number; order: number }>()
    for (const sub of subscriptions) {
      const parsed = safeDate(sub.endDate)
      if (!parsed) continue

      const key = `${parsed.getFullYear()}-${parsed.getMonth()}`
      const label = parsed.toLocaleString(locale, { month: 'short', year: 'numeric' })
      const order = parsed.getFullYear() * 12 + parsed.getMonth()

      const current = buckets.get(key)
      buckets.set(key, { label, order, value: (current?.value ?? 0) + 1 })
    }

    return Array.from(buckets.values())
      .sort((a, b) => a.order - b.order)
      .slice(-6)
  }, [locale, subscriptions])

  const statusBreakdown = useMemo(() => {
    const acc: Record<string, number> = {}
    for (const sub of subscriptions) {
      const key = sub.status || 'INCONNU'
      acc[key] = (acc[key] ?? 0) + 1
    }
    return Object.entries(acc).map(([status, value]) => ({ status, value }))
  }, [subscriptions])

  const upcoming = useMemo(() => {
    return subscriptions
      .slice()
      .filter((s) => Boolean(safeDate(s.endDate)))
      .sort((a, b) => (safeDate(a.endDate)?.getTime() ?? 0) - (safeDate(b.endDate)?.getTime() ?? 0))
      .slice(0, 5)
  }, [subscriptions])

  const statusChartData = useMemo(
    () =>
      statusBreakdown.map((entry) => ({
        ...entry,
        label: t(`status.${entry.status}` as any, { fallback: entry.status }),
        fill: STATUS_COLORS[entry.status] ?? STATUS_COLORS.EXPIRED,
      })),
    [statusBreakdown, t],
  )

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>{t('expiry.title')}</CardTitle>
          <CardDescription>{t('expiry.description')}</CardDescription>
        </CardHeader>

        <CardContent>
          <ChartContainer config={expiryChartConfig}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={expiryTrend} margin={{ left: 16, right: 16, top: 16, bottom: 16 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Line
                  dataKey="value"
                  type="natural"
                  stroke={STATUS_COLORS.ACTIVE}
                  strokeWidth={2}
                  connectNulls
                  dot={({ cx, cy }) => (
                    <circle
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={STATUS_COLORS.ACTIVE}
                      stroke={STATUS_COLORS.ACTIVE}
                    />
                  )}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('statusChart.title')}</CardTitle>
          <CardDescription>{t('statusChart.description')}</CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <ChartContainer config={statusChartConfig}>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={statusChartData}
                  dataKey="value"
                  nameKey="label"
                  innerRadius={60}
                  label
                >
                  {statusChartData.map((entry) => (
                    <Cell key={entry.status} fill={entry.fill} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>

          <div className="space-y-2 text-sm">
            {upcoming.length ? (
              upcoming.map((subscription) => {
                const endDate = safeDate(subscription.endDate)
                return (
                  <div
                    key={subscription.id}
                    className="flex items-center justify-between rounded-md border border-border/70 p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {endDate ? endDate.toLocaleDateString(locale) : t('upcoming.unknownDate')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t(`status.${subscription.status || 'INCONNU'}` as any, {
                          fallback: subscription.status || 'INCONNU',
                        })}
                      </p>
                    </div>
                  </div>
                )
              })
            ) : (
              <p className="text-muted-foreground">{t('upcoming.empty')}</p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
