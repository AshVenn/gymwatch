import { Building2, Users2, Activity, Gauge } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { SuperAdminGym } from '@/app/(dashboard)/super-admin/hooks'

type Props = {
  gyms: SuperAdminGym[]
}

export function GymSummaryCards({ gyms }: Props) {
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
    { label: 'Salles actives', value: metrics.active, helper: `${metrics.totalGyms} au total`, icon: Building2 },
    { label: 'Membres gérés', value: metrics.members, helper: `${metrics.subs} abonnements`, icon: Users2 },
    { label: 'Suspensions', value: metrics.suspended, helper: `${metrics.expired} expirées`, icon: Activity },
    { label: 'Capacité admins', value: `${adminUsage}%`, helper: 'Accès utilisés', icon: Gauge },
  ]

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="border-border/60 bg-card text-card-foreground">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardDescription>{card.label}</CardDescription>
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
