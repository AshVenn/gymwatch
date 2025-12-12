'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  ArrowUpRight,
  Download,
  Sparkles,
  TrendingUp,
  Activity,
  BarChart3,
  Users,
  UserPlus,
} from 'lucide-react'
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

import { usePlanFeatures } from '@/app/hooks/use-plan-features'
import { useVariantOptions } from '@/app/hooks/use-variants'
import { PaginationControls } from '@/components/dashboard/pagination-controls'
import { VariantSelector } from '@/components/dashboard/variant-selector'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'

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
  const t = useTranslations('dashOwAdDashboard')
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
      if (fallback && fallback !== 'all') setSelectedVariant(fallback)
    }
  }, [allowAllVariants, defaultVariantId, lockedVariantId, selectedVariant, setSelectedVariant, variants])

  const defaultStats = useMemo<DashboardStats>(
    () => ({
      monthlyRevenue: 0,
      activeMembers: 0,
      newMembers: 0,
      percentageChange: 0,
      revenueByMonth: [],
      planDistribution: [],
      expiringSoon: [],
      todayVisitorCount: 0,
      canViewRevenue: true,
    }),
    []
  )

  const { data: stats = defaultStats, isLoading, isError } = useQuery({
    queryKey: ['dashboard-stats', session?.user?.gymId, variantFilter],
    enabled: Boolean(session?.user?.gymId) && !variantsLoading,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (variantFilter) params.set('variantId', variantFilter)

      const response = await fetch(
        `/api/gym-team/dashboard/stats${params.toString() ? `?${params.toString()}` : ''}`,
      )
      if (!response.ok) throw new Error(t('errors.statsFetch'))

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
  useEffect(() => setExpiringPage(1), [expiringSoon.length])

  const canViewRevenue = stats.canViewRevenue !== false
  const percentageChange = stats.percentageChange ?? 0

  const statCards: Array<{
    title: string
    value: string
    valueClass?: string
    icon: LucideIcon
    accent: string
    subtitle?: string
  }> = [
    canViewRevenue
      ? {
          title: t('cards.monthlyRevenue.title'),
          value: t('cards.monthlyRevenue.value', { value: (stats.monthlyRevenue ?? 0).toLocaleString() }),
          icon: BarChart3,
          accent: 'from-primary/20 via-primary/10 to-primary/5',
          subtitle: t('cards.monthlyRevenue.subtitle'),
        }
      : null,
    {
      title: t('cards.visitsToday.title'),
      value: (stats.todayVisitorCount ?? 0).toLocaleString(),
      icon: Activity,
      accent: 'from-blue-500/20 via-blue-500/10 to-blue-500/5',
      subtitle: t('cards.visitsToday.subtitle'),
    },
    {
      title: t('cards.activeMembers.title'),
      value: (stats.activeMembers ?? 0).toLocaleString(),
      icon: Users,
      accent: 'from-emerald-500/20 via-emerald-500/10 to-emerald-500/5',
      subtitle: t('cards.activeMembers.subtitle'),
    },
    {
      title: t('cards.newMembers.title'),
      value: (stats.newMembers ?? 0).toLocaleString(),
      icon: UserPlus,
      accent: 'from-amber-500/20 via-amber-500/10 to-amber-500/5',
      subtitle: t('cards.newMembers.subtitle'),
    },
    canViewRevenue
      ? {
          title: t('cards.vsLastMonth.title'),
          value: t('cards.vsLastMonth.value', {
            sign: percentageChange >= 0 ? '+' : '',
            value: percentageChange,
          }),
          valueClass: percentageChange >= 0 ? 'text-emerald-600' : 'text-red-600',
          icon: TrendingUp,
          accent:
            percentageChange >= 0
              ? 'from-emerald-500/20 via-emerald-500/10 to-emerald-500/5'
              : 'from-rose-500/20 via-rose-500/10 to-rose-500/5',
          subtitle: t('cards.vsLastMonth.subtitle'),
        }
      : null,
  ].filter(Boolean) as any

  if (isLoading || variantsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between gap-4">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-64" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <Skeleton key={idx} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    )
  }

  if (isError) {
    return <div className="py-10 text-center text-red-500">{t('errors.statsGeneric')}</div>
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
    revenue: { label: t('charts.revenueLegend'), color: 'oklch(0.488 0.243 264.376)' },
  }
  const planChartConfig: ChartConfig = { value: { label: t('charts.distributionTitle') } }
  const memberRadialConfig: ChartConfig = {
    [t('charts.active')]: { label: t('charts.active'), color: computedColors[0] },
    [t('charts.inactive')]: { label: t('charts.inactive'), color: computedColors[3] },
  }

  const totalMembers = Math.max(
    stats.activeMembers ?? 0,
    planDistribution.reduce((sum, p) => sum + (p.value ?? 0), 0)
  )

  const memberRadialData = [
    { name: t('charts.active'), value: stats.activeMembers ?? 0, fill: computedColors[0] },
    { name: t('charts.inactive'), value: Math.max(totalMembers - (stats.activeMembers ?? 0), 0), fill: computedColors[3] },
  ]

  const downloadExcel = async (type: 'earnings' | 'top-members' | 'loyal-members') => {
    if (type === 'earnings' && !canViewRevenue) {
      toast.error(t('errors.downloadNotAllowed'))
      return
    }
    try {
      setDownloading(type)
      const params = new URLSearchParams({ type })
      if (variantFilter) params.set('variantId', variantFilter)

      const response = await fetch(`/api/gym-team/reports/excel?${params.toString()}`)
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        const message = (payload as any)?.error ?? t('errors.downloadFailed')
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
      toast.error((error as Error).message ?? t('errors.exportFailed'))
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-primary/25 bg-linear-to-r from-primary/15 via-primary/10 to-background p-6 shadow-lg md:p-8">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,hsl(var(--primary)/0.25),transparent_32%),radial-gradient(circle_at_80%_0%,hsl(var(--primary)/0.18),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_60%_80%,hsl(var(--primary)/0.08),transparent_30%)] blur-2xl" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <Badge variant="outline" className="rounded-full border-primary/40 bg-white/50 text-primary shadow-sm backdrop-blur">
              {t('hero.overviewBadge')}
            </Badge>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              {t('hero.kicker')}
            </div>

            <h1 className="text-3xl font-bold leading-tight">{t('hero.title')}</h1>
            <p className="max-w-2xl text-sm text-muted-foreground">{t('hero.description')}</p>

            <div className="flex flex-wrap gap-3">
              <Button className="rounded-2xl shadow-md" asChild>
                <Link href="/dashboard/members">
                  <Sparkles className="mr-2 h-4 w-4" />
                  {t('hero.addMember')}
                </Link>
              </Button>

              <Button
                variant="outline"
                className="rounded-2xl border-primary/40 bg-card/80 backdrop-blur"
                onClick={() => downloadExcel('earnings')}
                disabled={!hasExcelReports || downloading === 'earnings' || !canViewRevenue}
              >
                <Download className="mr-2 h-4 w-4" />
                {hasExcelReports
                  ? downloading === 'earnings'
                    ? t('hero.exporting')
                    : t('hero.exportRevenue')
                  : t('hero.exportPro')}
              </Button>
            </div>
          </div>

          {/* Mini stats */}
          <div className="grid w-full max-w-sm gap-3 rounded-2xl border border-border/60 bg-card/85 p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('miniStats.activeMembers')}</span>
              <span className="text-lg font-semibold">{stats.activeMembers.toLocaleString()}</span>
            </div>

            {canViewRevenue ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t('miniStats.monthlyRevenue')}</span>
                <span className="text-lg font-semibold">{stats.monthlyRevenue.toLocaleString()} MAD</span>
              </div>
            ) : null}

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('miniStats.visitsToday')}</span>
              <span className="text-lg font-semibold">{stats.todayVisitorCount.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-muted/60 px-3 py-2 text-sm">
              <span className="flex items-center gap-2 font-semibold">
                <TrendingUp className="h-4 w-4 text-primary" />
                {percentageChange >= 0 ? t('miniStats.up') : t('miniStats.down')}
              </span>
              <span className={percentageChange >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                {percentageChange >= 0 ? '+' : ''}
                {percentageChange}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Variants + quick links */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <VariantSelector
            variants={variants}
            value={selectedVariant}
            onChange={setSelectedVariant}
            isGymAdmin={isGymAdmin}
            lockedVariantId={lockedVariantId}
            loading={variantsLoading}
            allowAll={allowAllVariants}
          />

          <div className="flex flex-wrap gap-2">
            <Button variant="ghost" className="rounded-2xl" asChild>
              <Link href="/dashboard/presence">
                {t('quickLinks.presence')}
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button variant="ghost" className="rounded-2xl" asChild>
              <Link href="/dashboard/access-logs">
                {t('quickLinks.accessLogs')}
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {multiVariantLocked ? (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
            <div className="space-y-1">
              <p className="font-semibold">{t('multiVariant.title')}</p>
              <p>
                {t.rich('multiVariant.body', {
                  upgradeLink: (chunks) => (
                    <Link href="/dashboard/settings" className="font-semibold text-amber-900 underline">
                      {t('multiVariant.upgrade')}
                    </Link>
                  ),
                })}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <Card
              key={card.title}
              className="relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className={`pointer-events-none absolute inset-0 bg-linear-to-br ${card.accent} opacity-60 blur-2xl`} />
              <CardHeader className="relative pb-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm font-semibold text-foreground">{card.title}</CardTitle>
                    {card.subtitle ? <CardDescription>{card.subtitle}</CardDescription> : null}
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/70 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className={`text-3xl font-bold ${card.valueClass ?? ''}`}>{card.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts */}
      <div className={`grid gap-4 ${canViewRevenue ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
        {canViewRevenue && (
          <Card className="lg:col-span-2 overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-sm backdrop-blur">
            <CardHeader className="pb-0">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>{t('charts.revenueTitle')}</CardTitle>
                  <CardDescription>{t('charts.revenueSubtitle')}</CardDescription>
                </div>
                <Badge variant="outline" className="rounded-full border-border/60">
                  {t('charts.autoUpdate')}
                </Badge>
              </div>
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

        <Card className="overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-sm backdrop-blur">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>{t('charts.distributionTitle')}</CardTitle>
                <CardDescription>{t('charts.distributionSubtitle')}</CardDescription>
              </div>
              <Badge variant="secondary" className="rounded-full bg-primary/10 text-primary">
                {t('charts.live')}
              </Badge>
            </div>
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

      {/* Expiring + radial */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-sm backdrop-blur">
          <CardHeader className="items-center pb-0 text-center">
            <CardTitle>{t('charts.radialTitle')}</CardTitle>
            <CardDescription>{t('charts.radialSubtitle')}</CardDescription>
          </CardHeader>

          <CardContent className="flex flex-1 items-center pb-0">
            <ChartContainer config={memberRadialConfig} className="mx-auto w-full max-w-[320px]">
              <div className="relative h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart data={memberRadialData} innerRadius="50%" outerRadius="90%" startAngle={90} endAngle={-270}>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <RadialBar dataKey="value" background cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <div className="text-3xl font-bold">{stats.activeMembers.toLocaleString()}</div>
                  <p className="text-sm text-muted-foreground">{t('charts.active')}</p>
                  <p className="text-xs text-muted-foreground">{t('charts.membersLabel', { count: totalMembers.toLocaleString() })}</p>
                </div>
              </div>
            </ChartContainer>
          </CardContent>

          <CardFooter className="flex-col gap-2 text-sm">
            <div className="flex items-center gap-2 font-medium leading-none">
              <TrendingUp className="h-4 w-4" />
              {t('charts.radialFooterLine', {
                active: stats.activeMembers.toLocaleString(),
                total: totalMembers.toLocaleString(),
              })}
            </div>
            <div className="text-muted-foreground leading-none">{t('charts.radialFooterHint')}</div>
          </CardFooter>
        </Card>

        <Card className="overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-sm backdrop-blur">
          <CardHeader>
            <CardTitle>{t('expiring.title')}</CardTitle>
            <CardDescription>{t('expiring.subtitle', { count: expiringSoon.length })}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {expiringSoon.length === 0 ? (
              <p className="py-4 text-center text-muted-foreground">{t('expiring.none')}</p>
            ) : (
              <>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                  <span>
                    {t('expiring.total', {
                      count: expiringSoon.length,
                      plural: expiringSoon.length > 1 ? 's' : '',
                    })}
                  </span>
                  <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {t('expiring.page', { page: expiringPage, pageCount: expiringPageCount })}
                  </span>
                </div>

                <div className="space-y-3">
                  {visibleExpiring.map((subscription) => (
                    <div
                      key={subscription.id}
                      className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/60 p-3"
                    >
                      <div>
                        <p className="font-medium">{subscription.memberName}</p>
                        <p className="text-sm text-muted-foreground">{subscription.endDate}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{t('expiring.days', { count: subscription.daysLeft })}</p>
                        <p className="text-xs text-muted-foreground">{t('expiring.left')}</p>
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

      {/* Reports */}
      <Card className="overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-sm backdrop-blur">
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>{t('reports.title')}</CardTitle>
            <CardDescription>
              {hasExcelReports ? t('reports.subtitlePro') : t('reports.subtitleUpgrade')}
            </CardDescription>
          </div>
          <Badge variant="outline" className="rounded-full border-primary/50 text-primary">
            {t('reports.proRecommended')}
          </Badge>
        </CardHeader>

        <CardContent>
          {hasExcelReports ? (
            <div className="flex flex-wrap gap-3">
              {canViewRevenue && (
                <Button
                  variant="secondary"
                  className="rounded-2xl"
                  onClick={() => downloadExcel('earnings')}
                  disabled={downloading === 'earnings'}
                >
                  {downloading === 'earnings' ? t('hero.exporting') : t('reports.revenueExcel')}
                </Button>
              )}

              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={() => downloadExcel('top-members')}
                disabled={downloading === 'top-members'}
              >
                {downloading === 'top-members' ? t('hero.exporting') : t('reports.topMembersExcel')}
              </Button>

              <Button
                variant="secondary"
                className="rounded-2xl"
                onClick={() => downloadExcel('loyal-members')}
                disabled={downloading === 'loyal-members'}
              >
                {downloading === 'loyal-members' ? t('reports.loyalExporting') : t('reports.loyalMembersExcel')}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t('reports.excelRestricted')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
