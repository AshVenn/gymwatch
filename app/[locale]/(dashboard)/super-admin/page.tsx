"use client"
import { useState } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { useLocale, useTranslations } from "next-intl"
import { useSession } from "next-auth/react"
import { useSuperAdminStats } from "./hooks"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

import { Activity, AlertTriangle, Building2, Gauge, TrendingUp, Users2, Download } from "lucide-react"

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
} from "recharts"

import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Permissions } from "@/lib/rbac/permissions"
import { hasPermission } from "@/lib/rbac/policies"

const STATUS_COLORS = ["var(--color-active)", "var(--color-suspended)", "var(--color-expired)"] as const

const STATUS_KEYS = ["ACTIVE", "SUSPENDED", "EXPIRED"] as const
type StatusKey = (typeof STATUS_KEYS)[number]

export default function SuperAdminOverviewPage() {
  const t = useTranslations("superAdminOverview")
  const { data: stats, isLoading, isError } = useSuperAdminStats()
  const locale = useLocale()
  const [downloading, setDownloading] = useState<"excel" | "pdf" | null>(null)
  const { data: session } = useSession()
  const role = session?.user?.role as string | undefined
  const canViewRevenue = hasPermission(role as any, Permissions.PlatformAnalyticsRevenue)
  const canExportReports = hasPermission(role as any, Permissions.PlatformReportsExport)

  const currencyFormatter = new Intl.NumberFormat(locale === "ar" ? "ar-MA" : locale === "en" ? "en-US" : "fr-MA", {
    style: "currency",
    currency: "MAD",
  })

  const STATUS_LABELS: Record<StatusKey, string> = {
    ACTIVE: t("status.active"),
    SUSPENDED: t("status.suspended"),
    EXPIRED: t("status.expired"),
  }

  const revenueChartConfig: ChartConfig = {
    revenue: {
      label: t("charts.revenue.seriesLabel"),
      color: STATUS_COLORS[0],
    },
  }

  const statusChartConfig: ChartConfig = {
    value: {
      label: t("charts.status.seriesLabel"),
    },
  }

  const radialStatusConfig: ChartConfig = {
    Actives: { label: t("charts.radial.activeLabel"), color: "var(--color-active)" },
    Suspendues: { label: t("charts.radial.suspendedLabel"), color: "var(--color-suspended)" },
    Expirees: { label: t("charts.radial.expiredLabel"), color: "var(--color-expired)" },
  }

  const downloadReport = async (format: "excel" | "pdf") => {
    try {
      setDownloading(format)

      const endpoint =
        format === "excel"
          ? `/api/super-admin/reports/excel?scope=global&locale=${locale}`
          : `/api/super-admin/reports/pdf?scope=global&locale=${locale}`

      console.log("[EXPORT] endpoint:", endpoint)

      const response = await fetch(endpoint, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      })

      console.log("[EXPORT] status:", response.status)
      console.log("[EXPORT] final url:", response.url)
      console.log("[EXPORT] content-type:", response.headers.get("content-type"))
      console.log("[EXPORT] content-length:", response.headers.get("content-length"))

      // ✅ 204 => rien à télécharger
      if (response.status === 204) {
        throw new Error("Le serveur a renvoyé 204 (No Content). La route n'envoie aucun PDF.")
      }

      // ✅ Si erreur, lis le body UNE SEULE FOIS en texte
      if (!response.ok) {
        const errText = await response.text().catch(() => "")
        throw new Error(errText || `HTTP ${response.status}`)
      }

      // ✅ Body binaire
      const blob = await response.blob()
      console.log("[EXPORT] blob type:", blob.type)
      console.log("[EXPORT] blob size:", blob.size)

      if (!blob.size) {
        throw new Error("Fichier vide (blob size = 0).")
      }

      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `super-admin-global-${Date.now()}.${format === "excel" ? "xlsx" : "pdf"}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)

      toast.success(t("toasts.downloadSuccess", { format: format.toUpperCase() }))
    } catch (error) {
      const message = error instanceof Error ? error.message : t("toasts.downloadError")
      toast.error(message)
      console.error("[PDF/Excel Export Error]", error)
    } finally {
      setDownloading(null)
    }
  }

  if (isLoading || !stats) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="space-y-2">
          <Skeleton className="h-9 w-64 rounded-xl" />
          <Skeleton className="h-5 w-96 rounded-lg" />
        </div>

        <Card className="border-border/60 bg-card/80 backdrop-blur-sm rounded-3xl shadow-lg">
          <CardHeader>
            <Skeleton className="h-6 w-48 rounded-lg" />
            <Skeleton className="h-4 w-80 rounded-lg" />
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Skeleton className="h-10 w-44 rounded-xl" />
            <Skeleton className="h-10 w-44 rounded-xl" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="border-border/60 bg-card/80 backdrop-blur-sm rounded-3xl shadow-md p-6">
              <Skeleton className="h-4 w-32 rounded-lg" />
              <Skeleton className="mt-4 h-10 w-24 rounded-xl" />
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="border-border/60 bg-card/80 backdrop-blur-sm rounded-3xl shadow-lg lg:col-span-2">
            <CardHeader className="pb-0">
              <Skeleton className="h-6 w-48 rounded-lg" />
              <Skeleton className="h-4 w-64 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-80 w-full rounded-2xl" />
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/80 backdrop-blur-sm rounded-3xl shadow-lg">
            <CardHeader className="pb-0">
              <Skeleton className="h-6 w-52 rounded-lg" />
              <Skeleton className="h-4 w-48 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-80 w-full rounded-2xl" />
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/60 bg-card/80 backdrop-blur-sm rounded-3xl shadow-lg">
            <CardHeader>
              <Skeleton className="h-6 w-56 rounded-lg" />
              <Skeleton className="h-4 w-52 rounded-lg" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-64 w-full rounded-2xl" />
            </CardContent>
          </Card>
          <Card className="border-border/60 bg-card/80 backdrop-blur-sm rounded-3xl shadow-lg">
            <CardHeader className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-56 rounded-lg" />
                <Skeleton className="h-4 w-64 rounded-lg" />
              </div>
              <Skeleton className="h-6 w-6 rounded-full" />
            </CardHeader>
            <CardContent className="space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-2xl border border-border/50 p-4">
                  <Skeleton className="h-5 w-48 rounded-lg" />
                  <Skeleton className="h-5 w-20 rounded-lg" />
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
    label: STATUS_LABELS[entry.status as StatusKey] ?? entry.status,
    fill: STATUS_COLORS[index % STATUS_COLORS.length],
  }))

  const activeShare = stats.totalGyms ? Math.round((stats.activeGyms / stats.totalGyms) * 100) : 0
  const expiringSoonCount = stats.expiringGyms?.length ?? 0

  const radialStatusData = [
    { name: "Actives", value: stats.activeGyms ?? 0, fill: STATUS_COLORS[0] },
    { name: "Suspendues", value: stats.suspendedGyms ?? 0, fill: STATUS_COLORS[1] },
    {
      name: "Expirees",
      value: Math.max((stats.totalGyms ?? 0) - (stats.activeGyms ?? 0) - (stats.suspendedGyms ?? 0), 0),
      fill: STATUS_COLORS[2],
    },
  ]

  const revenueChartData = (stats.revenueTrend ?? []).map((point, index) => {
    const originalLabel = point.month ?? `M${index + 1}`
    const normalized = originalLabel
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\./g, "")
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          {t("header.title")}
        </h1>
        <p className="text-muted-foreground text-lg leading-relaxed">{t("header.subtitle")}</p>
      </div>

      {canExportReports ? (
        <Card className="border-border/60 bg-card/90 backdrop-blur-sm rounded-3xl shadow-lg transition-all duration-300 hover:shadow-xl">
          <CardHeader>
            <CardTitle className="text-xl">{t("exports.title")}</CardTitle>
            <CardDescription className="text-base">{t("exports.subtitle")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => downloadReport("excel")}
              disabled={downloading === "excel"}
              className="gap-2 rounded-xl border-border/60 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:scale-105"
            >
              <Download size={16} />
              {downloading === "excel" ? t("exports.exporting") : t("exports.excel")}
            </Button>
            <Button
              variant="outline"
              onClick={() => downloadReport("pdf")}
              disabled={downloading === "pdf"}
              className="gap-2 rounded-xl border-border/60 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:scale-105"
            >
              <Download size={16} />
              {downloading === "pdf" ? t("exports.exporting") : t("exports.pdf")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="border-border/60 bg-card/90 backdrop-blur-sm rounded-3xl shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("pulse.activationTitle")}</CardTitle>
            <Gauge className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{activeShare}%</p>
            <p className="text-sm text-muted-foreground">{t("pulse.activationSubtitle", { total: stats.totalGyms })}</p>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/90 backdrop-blur-sm rounded-3xl shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("pulse.expiringTitle")}</CardTitle>
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{expiringSoonCount}</p>
            <p className="text-sm text-muted-foreground">{t("pulse.expiringSubtitle")}</p>
          </CardContent>
        </Card>
      </div>

      <div className={`grid grid-cols-1 gap-6 sm:grid-cols-2 ${canViewRevenue ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        <Card className="group border-border/60 bg-card/90 backdrop-blur-sm rounded-3xl shadow-md transition-all duration-300 hover:shadow-xl hover:scale-105">
          <CardHeader className="pb-3">
            <CardDescription className="text-sm font-medium">{t("kpis.totalGyms")}</CardDescription>
            <CardTitle className="flex items-center gap-3 text-4xl">
              <Building2 className="h-7 w-7 text-primary transition-transform duration-300 group-hover:scale-110" />
              {stats.totalGyms}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="group border-border/60 bg-card/90 backdrop-blur-sm rounded-3xl shadow-md transition-all duration-300 hover:shadow-xl hover:scale-105">
          <CardHeader className="pb-3">
            <CardDescription className="text-sm font-medium">{t("kpis.activeSubscribers")}</CardDescription>
            <CardTitle className="flex items-center gap-3 text-4xl">
              <Users2 className="h-7 w-7 text-primary transition-transform duration-300 group-hover:scale-110" />
              {stats.totalSubscribers}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card className="group border-border/60 bg-card/90 backdrop-blur-sm rounded-3xl shadow-md transition-all duration-300 hover:shadow-xl hover:scale-105">
          <CardHeader className="pb-3">
            <CardDescription className="text-sm font-medium">{t("kpis.totalMembers")}</CardDescription>
            <CardTitle className="flex items-center gap-3 text-4xl">
              <Gauge className="h-7 w-7 text-primary transition-transform duration-300 group-hover:scale-110" />
              {stats.totalMembers}
            </CardTitle>
          </CardHeader>
        </Card>

        {canViewRevenue ? (
          <Card className="group border-border/60 bg-card/90 backdrop-blur-sm rounded-3xl shadow-md transition-all duration-300 hover:shadow-xl hover:scale-105">
            <CardHeader className="pb-3">
              <CardDescription className="text-sm font-medium">{t("kpis.monthlyRevenue")}</CardDescription>
              <CardTitle className="flex items-center gap-3 text-4xl">
                <Activity className="h-7 w-7 text-primary transition-transform duration-300 group-hover:scale-110" />
                <span className="text-2xl">{currencyFormatter.format(stats.monthlyRevenue ?? 0)}</span>
              </CardTitle>
            </CardHeader>
          </Card>
        ) : null}
      </div>

      <div className={`grid gap-6 md:grid-cols-1 ${canViewRevenue ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        {canViewRevenue ? (
          <Card className="border-border/60 bg-card/90 backdrop-blur-sm rounded-3xl shadow-lg lg:col-span-2">
            <CardHeader className="pb-0">
              <CardTitle className="text-xl">{t("charts.revenue.title")}</CardTitle>
              <CardDescription className="text-base">{t("charts.revenue.subtitle")}</CardDescription>
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
              {t("charts.revenue.footer")}
            </CardFooter>
          </Card>
        ) : null}

        <Card className={`border-border/60 bg-card/90 backdrop-blur-sm rounded-3xl shadow-lg ${canViewRevenue ? "" : "lg:col-span-1"}`}>
          <CardHeader className="pb-0">
            <CardTitle className="text-xl">{t("charts.status.title")}</CardTitle>
            <CardDescription className="text-base">{t("charts.status.subtitle")}</CardDescription>
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

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        <Card className="flex flex-col border-border/60 bg-card/90 backdrop-blur-sm rounded-3xl shadow-lg">
          <CardHeader className="items-center pb-0 text-center">
            <CardTitle className="text-xl">{t("charts.radial.title")}</CardTitle>
            <CardDescription className="text-base">{t("charts.radial.subtitle")}</CardDescription>
          </CardHeader>

          <CardContent className="flex flex-1 items-center pb-0">
            <ChartContainer config={radialStatusConfig} className="mx-auto w-full max-w-[320px]">
              <div className="relative h-65">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    data={radialStatusData}
                    innerRadius="50%"
                    outerRadius="90%"
                    startAngle={90}
                    endAngle={-270}
                  >
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <RadialBar dataKey="value" background cornerRadius={10} />
                  </RadialBarChart>
                </ResponsiveContainer>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <div className="text-3xl font-bold">{activeShare}%</div>
                  <p className="text-sm text-muted-foreground">{t("charts.radial.centerActive")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("charts.radial.centerGyms", { count: stats.totalGyms })}
                  </p>
                </div>
              </div>
            </ChartContainer>
          </CardContent>

          <CardFooter className="flex-col gap-2 text-sm">
            <div className="flex items-center gap-2 leading-none font-medium">
              <TrendingUp className="h-4 w-4" />
              {t("charts.radial.footerLine", { share: activeShare, total: stats.totalGyms })}
            </div>
            <div className="text-muted-foreground leading-none">{t("charts.radial.footerHint")}</div>
          </CardFooter>
        </Card>

        <Card className="border-border/60 bg-card/90 backdrop-blur-sm rounded-3xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">{t("expiring.title")}</CardTitle>
              <CardDescription className="text-base">{t("expiring.subtitle")}</CardDescription>
            </div>
            <AlertTriangle className="h-6 w-6 text-amber-500" />
          </CardHeader>

          <CardContent className="space-y-3">
            {stats.expiringGyms.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">{t("expiring.empty")}</p>
            ) : (
              stats.expiringGyms.map((gym) => (
                <div
                  key={gym.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4 transition-all duration-200 hover:bg-muted/50 hover:scale-[1.02]"
                >
                  <div>
                    <p className="font-semibold text-base">{gym.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("expiring.expiresInDays", { days: gym.daysRemaining })}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="rounded-full">
                      {STATUS_LABELS[gym.status as StatusKey] ?? gym.status}
                    </Badge>
                    <Button
                      size="sm"
                      variant="secondary"
                      asChild
                      className="rounded-xl transition-all duration-200 hover:scale-105"
                    >
                      <Link href={`/super-admin/gyms?focus=${gym.id}`}>{t("expiring.inspect")}</Link>
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
