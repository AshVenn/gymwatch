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
  const revenueFormatter = new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    maximumFractionDigits: 0,
  })

  const cards = [
    {
      label: 'Revenus cumulés',
      value: revenueFormatter.format(metrics.totalRevenue),
      helper: `Ticket moyen ${revenueFormatter.format(metrics.avgTicket || 0)}`,
      Icon: TrendingUp,
    },
    {
      label: 'Abonnements actifs',
      value: metrics.active,
      helper: `${metrics.retentionRate}% de rétention`,
      Icon: Users,
    },
    {
      label: 'Expire < 5 jours',
      value: metrics.expiringSoon,
      helper: 'Planifiez vos relances',
      Icon: AlertTriangle,
    },
    {
      label: 'Abonnements expirés',
      value: metrics.expired,
      helper: 'À traiter en priorité',
      Icon: Shield,
    },
  ]

  return (
    <section className="space-y-6 rounded-3xl border border-border/70 bg-card p-6 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Flux d'abonnements</p>
          <h1 className="mt-2 text-3xl font-semibold">Abonnements</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Vision temps réel des membres, revenus et échéances afin d'agir avant les expirations.
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-border/60 px-4 py-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
          <Sparkles className="h-4 w-4 text-primary" />
          Actualisé en direct
        </span>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label} className="border-border/60 bg-secondary/40 text-secondary-foreground">
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
