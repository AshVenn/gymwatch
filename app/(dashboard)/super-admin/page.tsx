'use client'

import { useState } from 'react'
import { useSuperAdminStats } from './hooks'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity, AlertTriangle, Building2, Gauge, TrendingUp, Users2 } from 'lucide-react'
import {
  CartesianGrid,
  Cell,
  Dot,
  Label,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import Link from 'next/link'
import { toast } from 'sonner'

const currencyFormatter = new Intl.NumberFormat('fr-MA', {
  style: 'currency',
  currency: 'MAD',
})

const STATUS_COLORS = ['hsl(var(--primary))', 'hsl(var(--accent))', 'oklch(var(--chart-3))']

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendu',
  EXPIRED: 'Expiré',
}

const revenueChartConfig: ChartConfig = {
  revenue: {
    label: 'Revenus',
    color: 'var(--chart-2)',
  },
}

const statusChartConfig: ChartConfig = {
  value: {
    label: 'Salles',
  },
}

const radialChartConfig: ChartConfig = {
  value: {
    label: 'Part active',
  },
}

export default function SuperAdminOverviewPage() {
  const { data: stats, isLoading, isError } = useSuperAdminStats()
  const [downloading, setDownloading] = useState<string | null>(null)

  const downloadReport = async (format: 'excel' | 'pdf') => {
    try {
      setDownloading(format)
      const endpoint =
        format === 'excel'
          ? '/api/super-admin/reports/excel?scope=global'
          : '/api/super-admin/reports/pdf?scope=global'
      const response = await fetch(endpoint)
      if (!response.ok) throw new Error('Export impossible')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `super-admin-global-${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (error) {
      toast.error((error as Error).message ?? 'Erreur lors du téléchargement')
    } finally {
      setDownloading(null)
    }
  }

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
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="h-32 animate-pulse bg-muted" />
        ))}
      </div>
    )
  }

  const statusChartData = stats.statusBreakdown.map((entry, index) => ({
    ...entry,
    label: STATUS_LABELS[entry.status] ?? entry.status,
    fill: STATUS_COLORS[index % STATUS_COLORS.length],
  }))

  const activeShare = stats.totalGyms
    ? Math.round((stats.activeGyms / stats.totalGyms) * 100)
    : 0

  
    
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Vue d'ensemble</h1>
        <p className="text-muted-foreground">Suivi consolidé des salles et abonnements.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Exports globaux</CardTitle>
          <CardDescription>Rapports consolidés pour toutes les salles.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={() => downloadReport('excel')} disabled={downloading === 'excel'}>
            {downloading === 'excel' ? 'Export...' : 'Rapport Excel'}
          </Button>
          <Button variant="outline" onClick={() => downloadReport('pdf')} disabled={downloading === 'pdf'}>
            {downloading === 'pdf' ? 'Export...' : 'Rapport PDF'}
          </Button>
        </CardContent>
      </Card>

      {/* KPI CARDS */}
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

      {/* LINE CHART */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-0">
            <CardTitle>Évolution des revenus</CardTitle>
            <CardDescription>Six derniers mois</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueChartConfig}>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart
                  data={stats.revenueTrend.map((point) => ({
                    ...point,
                    fill: 'hsl(var(--primary))',
                  }))}
                  margin={{ top: 24, left: 24, right: 24 }}
                >
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => value}

                  />
                  <YAxis />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Line
                    dataKey="revenue"
                    type="monotone"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    connectNulls
                    dot={({ payload, ...props }) => (
                      <Dot
                        key={payload.month}
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
          <CardFooter className="text-sm text-muted-foreground">
            <TrendingUp className="mr-2 h-4 w-4 text-primary" />
            Croissance continue observée ce semestre.
          </CardFooter>
        </Card>

        {/* PIE CHART */}
        <Card>
          <CardHeader className="pb-0">
            <CardTitle>Répartition des statuts</CardTitle>
            <CardDescription>Salles actives vs. suspendues</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={statusChartConfig}>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="value"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    labelLine={false}
                    label
                  >
                    {statusChartData.map((entry) => (
                      <Cell key={entry.label} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* RADIAL CHART */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle>Taux de salles actives</CardTitle>
            <CardDescription>Sur l'ensemble du parc</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer config={radialChartConfig} className="mx-auto aspect-square max-h-[260px]">
              <RadialBarChart
                data={[{ segment: 'actives', value: activeShare, fill: 'var(--chart-1)' }]}
                endAngle={120}
                innerRadius={80}
                outerRadius={140}
              >
                <PolarGrid gridType="circle" radialLines={false} stroke="none" />
                <RadialBar dataKey="value" background cornerRadius={8} />
                <PolarRadiusAxis tick={false} axisLine={false}>
                  <Label
                    content={({ viewBox }) => {
                      if (!viewBox || !('cx' in viewBox)) return null
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                          <tspan className="fill-foreground text-4xl font-bold">{activeShare}%</tspan>
                          <tspan className="fill-muted-foreground" x={viewBox.cx} y={(viewBox.cy || 0) + 24}>
                            Actives
                          </tspan>
                        </text>
                      )
                    }}
                  />
                </PolarRadiusAxis>
              </RadialBarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="flex-col gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{stats.activeGyms}</span> salles actives actuellement
            </div>
            <div>Objectif : maintenir plus de 80% d'activité.</div>
          </CardFooter>
        </Card>

        {/* EXPIRING GYMS */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Abonnements proches d'échéance</CardTitle>
              <CardDescription>Salles à suivre durant les 10 prochains jours.</CardDescription>
            </div>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.expiringGyms.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune salle n'approche de l'échéance.</p>
            ) : (
              stats.expiringGyms.map((gym) => (
                <div
                  key={gym.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-3"
                >
                  <div>
                    <p className="font-medium">{gym.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Expire dans {gym.daysRemaining} jour{gym.daysRemaining > 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{STATUS_LABELS[gym.status] ?? gym.status}</Badge>
                    <Button size="sm" variant="secondary" asChild>
                      <Link href={`/super-admin/gyms?focus=${gym.id}`}>Inspecter</Link>
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
