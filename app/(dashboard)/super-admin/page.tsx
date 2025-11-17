'use client'

import { useSuperAdminStats } from './hooks'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity, AlertTriangle, Building2, Gauge, Users2 } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  Tooltip,
  Legend,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const currencyFormatter = new Intl.NumberFormat('fr-MA', {
  style: 'currency',
  currency: 'MAD',
})

const STATUS_COLORS = ['#16a34a', '#f59e0b', '#dc2626']

export default function SuperAdminOverviewPage() {
  const { data: stats, isLoading, isError } = useSuperAdminStats()

  if (isError) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-destructive">
          Impossible de charger les statistiques globales.
        </CardContent>
      </Card>
    )
  }

  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <Card key={idx} className="h-32 animate-pulse bg-muted" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Vue d’ensemble</h1>
        <p className="text-muted-foreground">Suivi consolidé des salles et abonnements.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Nombre total de salles</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Building2 className="h-6 w-6 text-primary" />
              {stats.totalGyms}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Abonnés actifs</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Users2 className="h-6 w-6 text-primary" />
              {stats.totalSubscribers}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Membres (toutes salles)</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Gauge className="h-6 w-6 text-primary" />
              {stats.totalMembers}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Revenus ce mois-ci</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Activity className="h-6 w-6 text-primary" />
              {currencyFormatter.format(stats.monthlyRevenue)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Evolution des revenus</CardTitle>
            <CardDescription>Données sur 6 mois</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.revenueTrend}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Répartition des statuts</CardTitle>
            <CardDescription>Salles actives vs. suspendues</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.statusBreakdown} dataKey="value" nameKey="status" outerRadius={90}>
                  {stats.statusBreakdown.map((entry, index) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Abonnements proches d’échéance</CardTitle>
            <CardDescription>Salles à suivre durant les 10 prochains jours.</CardDescription>
          </div>
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        </CardHeader>
        <CardContent className="space-y-3">
          {stats.expiringGyms.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune salle n’approche de la date d’expiration.</p>
          ) : (
            stats.expiringGyms.map((gym) => (
              <div key={gym.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                <div>
                  <p className="font-medium">{gym.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Expire dans {gym.daysRemaining} jour{gym.daysRemaining > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{gym.status}</Badge>
                  <Button size="sm" variant="outline" asChild>
                    <a href={`/super-admin/gyms?focus=${gym.id}`}>Inspecter</a>
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
