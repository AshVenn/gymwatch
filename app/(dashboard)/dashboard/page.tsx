'use client'
import { useSession } from 'next-auth/react'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface DashboardStats {
  monthlyRevenue: number
  activeMembers: number
  newMembers: number
  percentageChange: number
  revenueByMonth: { month: string; revenue: number }[]
  planDistribution: { name: string; value: number }[]
  expiringSoon: { id: string; memberName: string; endDate: string; daysLeft: number }[]
}

export default function DashboardPage() {
  const { data: session } = useSession()

  const defaultStats = useMemo<DashboardStats>(() => ({
    monthlyRevenue: 0,
    activeMembers: 0,
    newMembers: 0,
    percentageChange: 0,
    revenueByMonth: [],
    planDistribution: [],
    expiringSoon: [],
  }), [])

  const { data: stats = defaultStats, isLoading, isError } = useQuery({
    queryKey: ['dashboard-stats', session?.user?.gymId],
    enabled: Boolean(session?.user?.gymId),
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats')

      if (!response.ok) {
        throw new Error('Impossible de charger les statistiques')
      }

      const data = await response.json()
      return {
        monthlyRevenue: data.monthlyRevenue ?? 0,
        activeMembers: data.activeMembers ?? 0,
        newMembers: data.newMembers ?? 0,
        percentageChange: data.percentageChange ?? 0,
        revenueByMonth: data.revenueByMonth ?? [],
        planDistribution: data.planDistribution ?? [],
        expiringSoon: data.expiringSoon ?? [],
      } satisfies DashboardStats
    },
  })

  if (isLoading) {
    return <div className="text-center py-10">Chargement des statistiques...</div>
  }

  if (isError) {
    return (
      <div className="text-center py-10 text-red-500">
        Impossible de charger les statistiques pour le moment.
      </div>
    )
  }

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Tableau de bord</h1>
        <p className="text-muted-foreground mt-2">Bienvenue dans votre espace de gestion</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenus du mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats.monthlyRevenue ?? 0).toLocaleString()} MAD
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Membres actifs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeMembers ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Nouveaux membres ce mois-ci
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.newMembers ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Évolution par rapport au mois dernier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                (stats.percentageChange ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {(stats.percentageChange ?? 0) >= 0 ? '+' : ''}
              {stats.percentageChange ?? 0}%
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <Card>
          <CardHeader>
            <CardTitle>Revenus des 12 derniers mois</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.revenueByMonth ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Répartition des abonnements par plan</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.planDistribution ?? []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {(stats.planDistribution ?? []).map((entry, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>

      {/* Expiring Soon */}
      <Card>
        <CardHeader>
          <CardTitle>Abonnements expirant dans les 7 prochains jours</CardTitle>
          <CardDescription>
            {stats.expiringSoon?.length ?? 0} abonnements expireront bientôt
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(stats.expiringSoon?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucun abonnement n'expire dans les 7 prochains jours
            </p>
          ) : (
            <div className="space-y-3">
              {(stats.expiringSoon ?? []).map((s) => (
                <div key={s.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="font-medium">{s.memberName}</p>
                    <p className="text-sm text-muted-foreground">{s.endDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{s.daysLeft} jours</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
