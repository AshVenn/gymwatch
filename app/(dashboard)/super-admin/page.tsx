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
import { Activity, AlertTriangle, Building2, Gauge, TrendingUp, Users2, Download } from 'lucide-react'
import {
  CartesianGrid,
  Cell,
  Dot,
  Label,
  Line,
  LineChart,
  Pie,
  PieChart,
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

const STATUS_COLORS = ['oklch(0.488 0.243 264.376)', 'oklch(0.967 0.001 286.375)', 'oklch(0.705 0.015 286.067)']

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendu',
  EXPIRED: 'Expiré',
}

const revenueChartConfig: ChartConfig = {
  revenue: {
    label: 'Revenus',
    color: 'oklch(0.488 0.243 264.376)',
  },
}

const statusChartConfig: ChartConfig = {
  value: {
    label: 'Salles',
  },
}

const radialChartConfig: ChartConfig = {
  active: {
    label: 'Actives',
    color: 'hsl(var(--primary))',
  },
  suspended: {
    label: 'Suspendues',
    color: 'hsl(var(--accent))',
  },
  expired: {
    label: 'Expirées',
    color: 'hsl(var(--secondary))',
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
      
      if (!response.ok) {
        const errorData = await response.text().catch(() => 'Erreur inconnue')
        throw new Error(errorData || `HTTP ${response.status}: Export impossible`)
      }

      const contentType = response.headers.get('content-type')
      const expectedType = format === 'excel' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf'
      
      if (contentType && !contentType.includes(expectedType)) {
        throw new Error(`Type de fichier invalide reçu: ${contentType}`)
      }

      const blob = await response.blob()
      
      if (blob.size === 0) {
        throw new Error('Le fichier reçu est vide')
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `super-admin-global-${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      
      toast.success(`Rapport ${format.toUpperCase()} téléchargé avec succès`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Erreur lors du téléchargement'
      toast.error(message)
      console.error('[PDF/Excel Export Error]', error)
    } finally {
      setDownloading(null)
    }
  }

  if (isError) {
    return (
      <Card className="border-destructive/40">
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

  const radialExpired = Math.max(stats.totalGyms - stats.activeGyms - stats.suspendedGyms, 0)
  const radialChartData = [
    {
      segment: 'Répartition',
      active: stats.activeGyms,
      suspended: stats.suspendedGyms,
      expired: radialExpired,
    },
  ]
  const totalGymsRadial = Math.max(
    radialChartData[0].active + radialChartData[0].suspended + radialChartData[0].expired,
    1,
  )

  const revenueChartData = (stats.revenueTrend ?? []).map((point, index) => {
    const originalLabel = point.month ?? `M${index + 1}`
    const normalized = originalLabel
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\./g, '')
      .trim()
      .toUpperCase()
    const monthKey = normalized || `M${index + 1}`

    return {
      month: monthKey,
      label: originalLabel,
      revenue: point.revenue ?? 0,
    }
  })
  const monthLabelLookup = new Map(revenueChartData.map((entry) => [entry.month, entry.label]))

  
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Vue d'ensemble</h1>
        <p className="text-muted-foreground">Suivi consolidé des salles et abonnements.</p>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Exports globaux</CardTitle>
          <CardDescription>Rapports consolidés pour toutes les salles.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            onClick={() => downloadReport('excel')} 
            disabled={downloading === 'excel'}
            className="gap-2"
          >
            <Download size={16} />
            {downloading === 'excel' ? 'Export en cours...' : 'Rapport Excel'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => downloadReport('pdf')} 
            disabled={downloading === 'pdf'}
            className="gap-2"
          >
            <Download size={16} />
            {downloading === 'pdf' ? 'Export en cours...' : 'Rapport PDF'}
          </Button>
        </CardContent>
      </Card>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>Nombre total de salles</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Building2 className="h-6 w-6 text-primary" />
              {stats.totalGyms}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>Abonnés actifs</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Users2 className="h-6 w-6 text-primary" />
              {stats.totalSubscribers}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-2">
            <CardDescription>Membres (toutes salles)</CardDescription>
            <CardTitle className="flex items-center gap-2 text-3xl">
              <Gauge className="h-6 w-6 text-primary" />
              {stats.totalMembers}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="border-border/70">
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
        <Card className="lg:col-span-2 border-border/70">
          <CardHeader className="pb-0">
            <CardTitle>Évolution des revenus</CardTitle>
            <CardDescription>Six derniers mois</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueChartConfig}>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={revenueChartData} margin={{ top: 24, left: 24, right: 24 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(value) => monthLabelLookup.get(String(value)) ?? String(value)}
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
                        key={payload.month}
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
          <CardFooter className="text-sm text-muted-foreground">
            <TrendingUp className="mr-2 h-4 w-4 text-primary" />
            Croissance continue observée ce semestre.
          </CardFooter>
        </Card>

        {/* PIE CHART */}
        <Card className="border-border/70">
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
        <Card className="flex flex-col border-border/70">
          <CardHeader className="items-center pb-0 text-center">
            <CardTitle>Taux de salles actives</CardTitle>
            <CardDescription>Sur l'ensemble du parc</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 items-center pb-0">
            <ChartContainer config={radialChartConfig} className="mx-auto aspect-square w-full max-w-[280px]">
              <RadialBarChart data={radialChartData} endAngle={180} innerRadius={80} outerRadius={130}>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                  <Label
                    content={({ viewBox }) => {
                      if (!viewBox || !('cx' in viewBox) || !('cy' in viewBox)) return null
                      return (
                        <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle">
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) - 10}
                            className="fill-foreground text-4xl font-bold"
                          >
                            {activeShare}%
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={(viewBox.cy || 0) + 16}
                            className="fill-muted-foreground text-sm"
                          >
                            Actives
                          </tspan>
                        </text>
                      )
                    }}
                  />
                </PolarRadiusAxis>
                <RadialBar
                  dataKey="active"
                  stackId="share"
                  cornerRadius={8}
                  fill="hsl(var(--primary))"
                  className="stroke-transparent stroke-2"
                />
                <RadialBar
                  dataKey="suspended"
                  stackId="share"
                  cornerRadius={8}
                  fill="hsl(var(--accent))"
                  className="stroke-transparent stroke-2"
                />
                <RadialBar
                  dataKey="expired"
                  stackId="share"
                  cornerRadius={8}
                  fill="hsl(var(--secondary))"
                  className="stroke-transparent stroke-2"
                />
              </RadialBarChart>
            </ChartContainer>
          </CardContent>
          <CardFooter className="grid gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-2 rounded-full bg-primary" />
              <span className="text-foreground font-medium">{stats.activeGyms}</span>
              <span>actives</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex size-2 rounded-full bg-accent" />
              <span className="text-foreground font-medium">{stats.suspendedGyms}</span>
              <span>suspendues</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex size-2 rounded-full bg-secondary" />
              <span className="text-foreground font-medium">{radialExpired}</span>
              <span>expirees</span>
            </div>
            <div className="text-xs text-muted-foreground">
              Objectif : maintenir plus de 80% d'activite sur {totalGymsRadial} salles.
            </div>
          </CardFooter>
        </Card>
        {/* EXPIRING GYMS */}
        <Card className="border-border/70">
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
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-3 hover:bg-muted/50 transition"
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

