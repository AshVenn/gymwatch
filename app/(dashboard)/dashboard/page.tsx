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
  Dot,
} from 'recharts'
import { TrendingUp } from 'lucide-react'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

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

  const COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)']
  const planDistribution = (stats.planDistribution ?? []) as DashboardStats['planDistribution']
  const expiringSoon = (stats.expiringSoon ?? []) as DashboardStats['expiringSoon']

  const revenueChartConfig: ChartConfig = {
    revenue: {
      label: 'Revenus',
      color: 'var(--chart-2)',
    },
  }

  const planChartConfig: ChartConfig = {
    value: {
      label: 'Abonnements',
    },
  }

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
            <CardDescription>Tendance mensuelle</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueChartConfig}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.revenueByMonth ?? []} margin={{ top: 24, left: 24, right: 24 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Line
                    type="natural"
                    dataKey="revenue"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    dot={({ payload, ...props }) => (
                      <Dot
                        r={5}
                        cx={props.cx}
                        cy={props.cy}
                        fill="var(--chart-2)"
                        stroke="var(--chart-2)"
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
            <CardTitle>Répartition des abonnements par plan</CardTitle>
            <CardDescription>Distribution des abonnements actifs</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={planChartConfig} className="[&_.recharts-pie-label-text]:fill-foreground mx-auto aspect-square max-h-[300px]">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={planDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                  >
                    {planDistribution.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

      </div>

      {/* Expiring Soon */}
      <Card>
        <CardHeader>
          <CardTitle>Abonnements expirant dans les 7 prochains jours</CardTitle>
          <CardDescription>
            {expiringSoon.length ?? 0} abonnements expireront bientôt
          </CardDescription>
        </CardHeader>
        <CardContent>
          {expiringSoon.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucun abonnement n'expire dans les 7 prochains jours
            </p>
          ) : (
            <div className="space-y-3">
              {expiringSoon.map((subscription) => (
                <div key={subscription.id} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg border border-border/50">
                  <div>
                    <p className="font-medium">{subscription.memberName}</p>
                    <p className="text-sm text-muted-foreground">{subscription.endDate}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{subscription.daysLeft} jours</p>
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
