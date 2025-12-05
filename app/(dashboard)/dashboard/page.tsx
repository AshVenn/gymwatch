'use client'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle,CardFooter } from '@/components/ui/card'
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
  RadialBar,
  RadialBarChart,
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
import { AlertTriangle, TrendingUp } from 'lucide-react'
import { useVariantOptions } from '@/app/hooks/use-variants'
import { VariantSelector } from '@/components/dashboard/variant-selector'
import { Skeleton } from '@/components/ui/skeleton'

interface DashboardStats {
  monthlyRevenue: number
  activeMembers: number
  newMembers: number
  percentageChange: number
  revenueByMonth: { month: string; revenue: number }[]
  planDistribution: { name: string; value: number }[]
  expiringSoon: { id: string; memberName: string; endDate: string; daysLeft: number }[]
  todayVisitorCount: number
  canViewRevenue: boolean
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const { hasExcelReports, hasMultiLocations } = usePlanFeatures()
  const [downloading, setDownloading] = useState<string | null>(null)
  const {
    variants,
    selectedVariant,
    setSelectedVariant,
    isGymAdmin,
    lockedVariantId,
    defaultVariantId,
    isLoading: variantsLoading,
  } = useVariantOptions({ allowAll: hasMultiLocations })
  const isMultiVariantGym = variants.length > 1
  const allowAllVariants = hasMultiLocations || !isMultiVariantGym
  const multiVariantLocked = isMultiVariantGym && !hasMultiLocations
  const variantFilter =
    selectedVariant === 'all'
      ? allowAllVariants
        ? null
        : defaultVariantId ?? variants[0]?.id ?? null
      : selectedVariant

  useEffect(() => {
    if (!allowAllVariants && selectedVariant === 'all') {
      const fallback = lockedVariantId ?? defaultVariantId ?? variants[0]?.id ?? 'all'
      if (fallback && fallback !== 'all') {
        setSelectedVariant(fallback)
      }
    }
  }, [allowAllVariants, defaultVariantId, lockedVariantId, selectedVariant, setSelectedVariant, variants])

  const defaultStats = useMemo<DashboardStats>(() => ({
    monthlyRevenue: 0,
    activeMembers: 0,
    newMembers: 0,
    percentageChange: 0,
    revenueByMonth: [],
    planDistribution: [],
    expiringSoon: [],
    todayVisitorCount: 0,
    canViewRevenue: true,
  }), [])

  const { data: stats = defaultStats, isLoading, isError } = useQuery({
    queryKey: ['dashboard-stats', session?.user?.gymId, variantFilter],
    enabled: Boolean(session?.user?.gymId) && !variantsLoading,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (variantFilter) {
        params.set('variantId', variantFilter)
      }
      const response = await fetch(`/api/dashboard/stats${params.toString() ? `?${params.toString()}` : ''}`)

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
        todayVisitorCount: data.todayVisitorCount ?? 0,
        canViewRevenue: data.canViewRevenue ?? true,
      } satisfies DashboardStats
    },
  })
  const expiringSoon = (stats.expiringSoon ?? []) as DashboardStats['expiringSoon']
  const [expiringPage, setExpiringPage] = useState(1)
  useEffect(() => {
    setExpiringPage(1)
  }, [expiringSoon.length])
  const canViewRevenue = stats.canViewRevenue !== false
  const statCards: Array<{ title: string; value: string; valueClass?: string }> = [
    canViewRevenue
      ? {
          title: 'Revenus du mois',
          value: `${(stats.monthlyRevenue ?? 0).toLocaleString()} MAD`,
        }
      : null,
    {
      title: 'Visites aujourd\'hui',
      value: (stats.todayVisitorCount ?? 0).toLocaleString(),
    },
    {
      title: 'Membres actifs',
      value: (stats.activeMembers ?? 0).toLocaleString(),
    },
    {
      title: 'Nouveaux membres ce mois-ci',
      value: (stats.newMembers ?? 0).toLocaleString(),
    },
    canViewRevenue
      ? {
          title: 'Evolution par rapport au mois dernier',
          value: `${(stats.percentageChange ?? 0) >= 0 ? '+' : ''}${stats.percentageChange ?? 0}%`,
          valueClass: (stats.percentageChange ?? 0) >= 0 ? 'text-green-600' : 'text-red-600',
        }
      : null,
  ].filter(Boolean) as Array<{ title: string; value: string; valueClass?: string }>

  if (isLoading || variantsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between gap-4">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    )
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

const memberRadialConfig: ChartConfig = {
    Actifs: { label: 'Actifs', color: computedColors[0] },
    Inactifs: { label: 'Inactifs', color: computedColors[3] },
  }

  const totalMembers = Math.max(
    stats.activeMembers ?? 0,
    planDistribution.reduce((sum, p) => sum + (p.value ?? 0), 0),
  )

  const memberRadialData = [
    { name: 'Actifs', value: stats.activeMembers ?? 0, fill: computedColors[0] },
    { name: 'Inactifs', value: Math.max(totalMembers - (stats.activeMembers ?? 0), 0), fill: computedColors[3] },
  ]

  const downloadExcel = async (type: 'earnings' | 'top-members' | 'loyal-members') => {
    if (type === 'earnings' && !canViewRevenue) {
      toast.error('Acces revenus reserve au proprietaire')
      return
    }
    try {
      setDownloading(type)
      const params = new URLSearchParams({ type })
      if (variantFilter) params.set('variantId', variantFilter)
      const response = await fetch(`/api/reports/excel?${params.toString()}`)
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message = (payload as any)?.error ?? 'Impossible de telecharger le rapport'
        throw new Error(message)
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

      <div className="space-y-3">
        <div className="flex justify-end">
          <VariantSelector
            variants={variants}
            value={selectedVariant}
            onChange={setSelectedVariant}
            isGymAdmin={isGymAdmin}
            lockedVariantId={lockedVariantId}
            loading={variantsLoading}
            allowAll={allowAllVariants}
          />
        </div>
        {multiVariantLocked ? (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="space-y-1">
              <p className="font-semibold">Vue multi-salles reservee</p>
              <p>
                Votre plan actuel ne permet pas d&apos;agreger plusieurs variantes. Choisissez une salle
                ou <Link href="/dashboard/settings" className="font-semibold text-amber-900 underline">mettez a niveau</Link>{' '}
                pour debloquer les exports consolides.
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.valueClass ?? ''}`}>
                {card.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className={`grid gap-4 ${canViewRevenue ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
        {canViewRevenue && (
          <Card className="lg:col-span-2 border-border/70">
            <CardHeader className="pb-0">
              <CardTitle>Evolution des revenus</CardTitle>
              <CardDescription>Douze derniers mois</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={revenueChartConfig}>
                <ResponsiveContainer width="100%" height={320}>
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
                      dataKey="revenue"
                      type="monotone"
                      stroke="oklch(0.488 0.243 264.376)"
                      strokeWidth={2}
                      connectNulls
                      dot={({ payload, ...props }) => (
                        <Dot
                          key={payload?.month}
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
        )}

        <Card className="border-border/70">
          <CardHeader className="pb-0">
            <CardTitle>Repartition des statuts</CardTitle>
            <CardDescription>Abonnements actifs vs. autres</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={planChartConfig}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={planDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    labelLine={false}
                    label
                  >
                    {planDistribution.map((entry, index) => (
                      <Cell key={`${entry.name}-${index}`} fill={computedColors[index % computedColors.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Radial Chart and Expiring Soon */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col border-border/70">
        <CardHeader className="items-center pb-0 text-center">
          <CardTitle>Taux d'abonnements actifs</CardTitle>
          <CardDescription>Sur l'ensemble des membres</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-1 items-center pb-0">
          <ChartContainer config={memberRadialConfig} className="mx-auto w-full max-w-[320px]">
            <div className="relative h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  data={memberRadialData}
                  innerRadius="50%"
                  outerRadius="90%"
                  startAngle={90}
                  endAngle={-270}
                >
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <RadialBar dataKey="value" nameKey="name" background cornerRadius={10} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="text-3xl font-bold">{stats.activeMembers.toLocaleString()}</div>
                <p className="text-sm text-muted-foreground">Actifs</p>
                <p className="text-xs text-muted-foreground">{totalMembers.toLocaleString()} membres</p>
              </div>
            </div>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 leading-none font-medium">
            <TrendingUp className="h-4 w-4" />
            {stats.activeMembers.toLocaleString()} actifs sur {totalMembers.toLocaleString()} membres
          </div>
          <div className="text-muted-foreground leading-none">
            Repartition des statuts d'abonnement
          </div>
        </CardFooter>
      </Card>

        {/* Expiring Soon */}
        <Card className="border-border/70">
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
      </div>

      <Card className="border-border/70">
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
              {canViewRevenue && (
                <Button
                  variant="outline"
                  onClick={() => downloadExcel('earnings')}
                  disabled={downloading === 'earnings'}
                >
                  {downloading === 'earnings' ? 'Export...' : 'Revenus Excel'}
                </Button>
              )}
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
