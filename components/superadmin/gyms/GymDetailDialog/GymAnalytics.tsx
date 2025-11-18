import type { SuperAdminGymDetail } from '@/app/(dashboard)/super-admin/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { ResponsiveContainer, LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Dot } from 'recharts'

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'hsl(var(--primary))',
  SUSPENDED: 'hsl(var(--accent))',
  EXPIRED: 'oklch(var(--chart-3))',
  EXPIRES_TODAY: 'oklch(var(--chart-4))',
}

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendu',
  EXPIRED: 'Expiré',
  EXPIRES_TODAY: "Expire aujourd'hui",
  INCONNU: 'Inconnu',
}

const expiryChartConfig: ChartConfig = {
  value: {
    label: 'Expirations',
    color: 'var(--chart-4)',
  },
}

const statusChartConfig: ChartConfig = {
  value: {
    label: 'Abonnements',
  },
}

type Props = {
  gym: SuperAdminGymDetail
}

export function GymAnalytics({ gym }: Props) {
  const subscriptions = gym.subscriptions ?? []

  const expiryTrend = (() => {
    const buckets = new Map<string, { label: string; value: number; order: number }>()
    subscriptions.forEach((sub) => {
      const parsed = new Date(sub.endDate)
      if (Number.isNaN(parsed.getTime())) return
      const key = `${parsed.getFullYear()}-${parsed.getMonth()}`
      const label = parsed.toLocaleString('fr-FR', { month: 'short', year: 'numeric' })
      const order = parsed.getFullYear() * 12 + parsed.getMonth()
      const current = buckets.get(key)
      buckets.set(key, { label, order, value: (current?.value ?? 0) + 1 })
    })
    return Array.from(buckets.values())
      .sort((a, b) => a.order - b.order)
      .slice(-6)
  })()

  const statusBreakdown = (() => {
    const accumulator: Record<string, number> = {}
    subscriptions.forEach((sub) => {
      const key = sub.status || 'INCONNU'
      accumulator[key] = (accumulator[key] ?? 0) + 1
    })
    return Object.entries(accumulator).map(([status, value]) => ({ status, value }))
  })()

  const upcoming = subscriptions
    .slice()
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime())
    .slice(0, 5)

  const statusChartData = statusBreakdown.map((entry) => ({
    ...entry,
    label: STATUS_LABELS[entry.status] ?? entry.status,
    fill: STATUS_COLORS[entry.status] ?? 'oklch(var(--chart-5))',
  }))

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Tendance des expirations</CardTitle>
          <CardDescription>6 derniers mois</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={expiryChartConfig}>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={expiryTrend.map((item) => ({ ...item, fill: 'hsl(var(--primary))' }))} margin={{ left: 16, right: 16 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent  hideLabel />}
                />
                <Line
                  dataKey="value"
                  type="natural"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  connectNulls
                  dot={({ payload, ...props }) => (
                    <Dot
                      key={payload.label}
                      r={5}
                      cx={props.cx}
                      cy={props.cy}
                      fill="hsl(var(--primary))"
                      stroke="hsl(var(--primary))"
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
          <CardTitle>Répartition des statuts</CardTitle>
          <CardDescription>Abonnements de la salle</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ChartContainer config={statusChartConfig}>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusChartData} dataKey="value" nameKey="label" innerRadius={60} label>
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
              upcoming.map((subscription) => (
                <div key={subscription.id} className="flex items-center justify-between rounded-md border border-border/70 p-3">
                  <div>
                    <p className="font-medium">
                      {new Date(subscription.endDate).toLocaleDateString('fr-FR')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {STATUS_LABELS[subscription.status] ?? subscription.status}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground">Pas d'expiration immédiate.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
