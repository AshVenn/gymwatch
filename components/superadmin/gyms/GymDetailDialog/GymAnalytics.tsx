import type { SuperAdminGymDetail } from '@/app/[locale]/(dashboard)/super-admin/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis } from 'recharts'
import { useTranslations, useLocale } from 'next-intl'
import { useMemo } from 'react'

const safeDate = (value: string | Date | null | undefined) => {
  if (!value) return null
  const parsed = value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'oklch(0.68 0.2 150)',
  SUSPENDED: 'oklch(0.65 0.18 55)',
  EXPIRED: 'oklch(0.63 0.17 280)',
  EXPIRES_TODAY: 'oklch(0.65 0.18 55)',
}

const expiryChartConfig: ChartConfig = {
  value: {
    label: 'Expirations',
    color: STATUS_COLORS.ACTIVE,
  },
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

  const statusChartData = useMemo(() => {
    const total = statusBreakdown.reduce((sum, entry) => sum + entry.value, 0)
    return statusBreakdown.map((entry) => {
      const percent = total > 0 ? Math.round((entry.value / total) * 100) : 0
      return {
        ...entry,
        percent,
        label: t(`status.${entry.status}` as any, { fallback: entry.status }),
        fill: STATUS_COLORS[entry.status] ?? STATUS_COLORS.EXPIRED,
      }
    })
  }, [statusBreakdown, t])

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
                  dot={({ cx, cy, index }) => (
                    <circle
                      key={`dot-${index}-${cx}-${cy}`}
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

        <CardContent className="space-y-3">
          {statusChartData.length ? (
            statusChartData.map((entry) => (
              <div key={entry.status} className="space-y-1">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: entry.fill }}
                      aria-hidden
                    />
                    <span className="sr-only">{entry.label}</span>
                  </span>
                  <span>{entry.percent}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${entry.percent}%`, background: entry.fill }}
                    aria-hidden
                  />
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">{t('statusChart.empty')}</p>
          )}
          <p className="text-xs text-muted-foreground">{t('statusChart.helper')}</p>
        </CardContent>
      </Card>
    </>
  )
}
