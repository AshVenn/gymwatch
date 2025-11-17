'use client'

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
const currencyFormatter = new Intl.NumberFormat('fr-MA', {
  style: 'currency',
  currency: 'MAD',
})

const STATUS_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)']
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

  const activeShare = stats.totalGyms ? Math.round((stats.activeGyms / stats.totalGyms) * 100) : 0

  const MONTH_ORDER = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const sortedTrend = stats.revenueTrend
  .map((p) => ({ ...p, fill: "var(--chart-2)" }))
  .sort((a, b) => MONTH_ORDER.indexOf(a.month) - MONTH_ORDER.indexOf(b.month));


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Vue d'ensemble</h1>
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
          <CardHeader className="pb-0">
            <CardTitle>Évolution des revenus</CardTitle>
            <CardDescription>Six derniers mois</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueChartConfig}>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={stats.revenueTrend.map((point) => ({ ...point, fill: 'var(--chart-2)' }))} margin={{ top: 24, left: 24, right: 24 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip
                    cursor={false}
                    content={<ChartTooltipContent hideLabel />}
                  />
                  <Line
                    dataKey="revenue"
                    type="natural"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    dot={({ payload, ...props }) => (
                      <Dot
                        key={payload.month}
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
          <CardFooter className="text-sm text-muted-foreground">
            <TrendingUp className="mr-2 h-4 w-4 text-primary" /> Croissance continue observée ce semestre.
          </CardFooter>
        </Card>
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

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle>Taux de salles actives</CardTitle>
            <CardDescription>Sur l'ensemble du parc</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            <ChartContainer config={radialChartConfig} className="mx-auto aspect-square max-h-[260px]">
              <RadialBarChart data={[{ segment: 'actives', value: activeShare, fill: 'var(--chart-1)' }]} endAngle={120} innerRadius={80} outerRadius={140}>
                <PolarGrid gridType="circle" radialLines={false} stroke="none" className="first:fill-muted last:fill-background" polarRadius={[86, 74]} />
                <RadialBar dataKey="value" background cornerRadius={8} />
                <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan className="fill-foreground text-4xl font-bold" x={viewBox.cx} y={viewBox.cy}>
                              {activeShare}%
                            </tspan>
                            <tspan className="fill-muted-foreground" x={viewBox.cx} y={(viewBox.cy || 0) + 24}>
                              Actives
                            </tspan>
                          </text>
                        )
                      }
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
            <div>Objectif: maintenir plus de 80% d'activité.</div>
          </CardFooter>
        </Card>

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
                <div key={gym.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 p-3">
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
