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
  Line,
  LineChart,
  Pie,
  PieChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import Link from 'next/link'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/skeleton'

const currencyFormatter = new Intl.NumberFormat('fr-MA', {
  style: 'currency',
  currency: 'MAD',
})

const STATUS_COLORS = ['var(--color-active)', 'var(--color-suspended)', 'var(--color-expired)']


const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Actif',
  SUSPENDED: 'Suspendu',
  EXPIRED: 'Expiré',
}

const revenueChartConfig: ChartConfig = {
  revenue: {
    label: 'Revenus',
    color: STATUS_COLORS[0],
  },
}

const statusChartConfig: ChartConfig = {
  value: {
    label: 'Salles',
  },
}

const radialStatusConfig: ChartConfig = {
  Actives: { label: 'Actives', color: 'var(--color-active)' },
  Suspendues: { label: 'Suspendues', color: 'var(--color-suspended)' },
  Expirees: { label: 'Expirees', color: 'var(--color-expired)' },
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
      <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-72" />
        </div>

        <Card className="border-border/70">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Skeleton className="h-10 w-40 rounded-full" />
            <Skeleton className="h-10 w-40 rounded-full" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="border-border/70 p-4">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-3 h-8 w-32" />
            </Card>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 border-border/70">
            <CardHeader className="pb-0">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-52" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full rounded-2xl" />
            </CardContent>
          </Card>
          <Card className="border-border/70">
            <CardHeader className="pb-0">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-40" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full rounded-2xl" />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="border-border/70">
            <CardHeader>
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-44" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-56 w-full rounded-2xl" />
            </CardContent>
          </Card>
          <Card className="border-border/70">
            <CardHeader className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-52" />
              </div>
              <Skeleton className="h-5 w-5 rounded-full" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl border border-border/50 p-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
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


  
  const radialStatusData = [
  { name: 'Actives', value: stats.activeGyms ?? 0, fill: STATUS_COLORS[0] },
  { name: 'Suspendues', value: stats.suspendedGyms ?? 0, fill: STATUS_COLORS[1] },
  {
    name: 'Expirees',
    value: Math.max((stats.totalGyms ?? 0) - (stats.activeGyms ?? 0) - (stats.suspendedGyms ?? 0), 0),
    fill: STATUS_COLORS[2],
  },
]

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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-3">
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
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          <Card className="flex flex-col border-border/70">
  <CardHeader className="items-center pb-0 text-center">
    <CardTitle>Taux de salles actives</CardTitle>
    <CardDescription>Sur l'ensemble du parc</CardDescription>
  </CardHeader>

  <CardContent className="flex flex-1 items-center pb-0">
    <ChartContainer config={radialStatusConfig} className="mx-auto w-full max-w-[320px]">
      <div className="relative h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={radialStatusData}
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
          <div className="text-3xl font-bold">{activeShare}%</div>
          <p className="text-sm text-muted-foreground">Actives</p>
          <p className="text-xs text-muted-foreground">{stats.totalGyms} salles</p>
        </div>
      </div>
    </ChartContainer>
  </CardContent>

  <CardFooter className="flex-col gap-2 text-sm">
    <div className="flex items-center gap-2 leading-none font-medium">
      <TrendingUp className="h-4 w-4" />
      {activeShare}% de salles actives sur {stats.totalGyms} au total
    </div>
    <div className="text-muted-foreground leading-none">
      Repartition des statuts sur l'ensemble du parc
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
