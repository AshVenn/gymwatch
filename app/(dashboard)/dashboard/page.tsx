'use client'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
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
  ResponsiveContainer,
  Dot,
} from 'recharts'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { Button } from '@/components/ui/button'
import { usePlanFeatures } from '@/app/hooks/use-plan-features'
import { PaginationControls } from '@/components/dashboard/pagination-controls'
import { toast } from 'sonner'

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
  const { hasExcelReports } = usePlanFeatures()
  const [downloading, setDownloading] = useState<string | null>(null)

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
  const expiringSoon = (stats.expiringSoon ?? []) as DashboardStats['expiringSoon']
  const [expiringPage, setExpiringPage] = useState(1)
  useEffect(() => {
    setExpiringPage(1)
  }, [expiringSoon.length])

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

  const planDistribution = (stats.planDistribution ?? []) as DashboardStats['planDistribution']
 
  const expiringPageSize = 5
  const expiringPageCount = Math.max(1, Math.ceil(Math.max(expiringSoon.length, 1) / expiringPageSize))
  const visibleExpiring = expiringSoon.slice((expiringPage - 1) * expiringPageSize, expiringPage * expiringPageSize)

  const computedColors = [
    'oklch(0.488 0.243 264.376)',
    'oklch(0.967 0.001 286.375)',
    'oklch(0.552 0.016 285.938)',
    'oklch(0.92 0.004 286.32)',
  ]

  const revenueChartConfig: ChartConfig = {
    revenue: {
      label: 'Revenus',
      color: 'oklch(0.488 0.243 264.376)',
    },
  }

  const planChartConfig: ChartConfig = {
    value: {
      label: 'Abonnements',
    },
  }

  const downloadExcel = async (type: 'earnings' | 'top-members' | 'loyal-members') => {
    try {
      setDownloading(type)
      const response = await fetch(`/api/reports/excel?type=${type}`)
      if (!response.ok) {
        throw new Error('Impossible de telecharger le rapport')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `rapport-${type}-${Date.now()}.xlsx`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error((error as Error).message ?? 'Export impossible')
    } finally {
      setDownloading(null)
    }
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
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => (typeof value === 'string' ? value.slice(0, 3) : value)}
                  />
                  <YAxis />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Line
                    type="natural"
                    dataKey="revenue"
                    stroke="oklch(0.488 0.243 264.376)"
                    strokeWidth={2}
                    connectNulls
                    dot={(props) => (
                      <Dot
                        key={`revenue-dot-${props.payload?.month ?? props.cx ?? props.cy}`}
                        r={5}
                        cx={props.cx}
                        cy={props.cy}
                        fill="oklch(0.488 0.243 264.376)"
                        stroke="oklch(0.488 0.243 264.376)"
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
                      <Cell key={`${entry.name}-${index}`} fill={computedColors[index % computedColors.length]} />
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
            {expiringSoon.length} abonnements expireront bientôt
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {expiringSoon.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Aucun abonnement n'expire dans les 7 prochains jours
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground mb-4">
                <span>
                  {expiringSoon.length} abonnement{expiringSoon.length > 1 ? 's' : ''} total
                </span>
                <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Page {expiringPage} / {expiringPageCount}
                </span>
              </div>
              <div className="space-y-3">
                {visibleExpiring.map((subscription) => (
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
              {expiringSoon.length > expiringPageSize && (
                <PaginationControls
                  page={expiringPage}
                  pageCount={expiringPageCount}
                  pageSize={expiringPageSize}
                  onPageChange={setExpiringPage}
                  totalItems={expiringSoon.length}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rapports et exports</CardTitle>
          <CardDescription>
            {hasExcelReports
              ? 'Téléchargez vos rapports avancés au format Excel'
              : 'Passez au plan Pro pour activer les exports Excel'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasExcelReports ? (
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => downloadExcel('earnings')}
                disabled={downloading === 'earnings'}
              >
                {downloading === 'earnings' ? 'Export...' : 'Revenus Excel'}
              </Button>
              <Button
                variant="outline"
                onClick={() => downloadExcel('top-members')}
                disabled={downloading === 'top-members'}
              >
                {downloading === 'top-members' ? 'Export...' : 'Top membres Excel'}
              </Button>
              <Button
                variant="outline"
                onClick={() => downloadExcel('loyal-members')}
                disabled={downloading === 'loyal-members'}
              >
                {downloading === 'loyal-members' ? 'Export...' : 'Membres fideles Excel'}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Les exports Excel (revenus, Top membres Excel, fidélité) sont réservés au plan Pro.
            </p>
          )}
        </CardContent>
      </Card>

    </div>
  )
}
