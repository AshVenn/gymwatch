"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useSession } from "next-auth/react"
import { useMutation, useQuery } from "@tanstack/react-query"
import { Activity, AlertTriangle, Clock3, LogOut, RefreshCw, Users } from "lucide-react"
import { useLocale, useTranslations } from "next-intl"
import { toast } from "sonner"

import { usePlanFeatures } from "@/app/hooks/use-plan-features"
import { useVariantOptions } from "@/app/hooks/use-variants"
import { VisitCharts } from "@/components/dashboard/visits/charts"
import { VisitFilters } from "@/components/dashboard/visits/filters"
import { VisitTable } from "@/components/dashboard/visits/visit-table"
import { usePagination } from "@/components/dashboard/pagination-controls"
import { VariantSelector } from "@/components/dashboard/variant-selector"
import { buildFeatureAccessItems, LockedFeatureState } from "@/components/dashboard/feature-access-grid"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

type VisitView = "day" | "period"

type VisitAnalyticsResponse = {
  visits: Array<{
    id: string
    memberId: string
    memberName: string
    variantId: string
    variantName: string
    checkIn: string
    checkOut: string | null
    durationMinutes: number
    isOverMaxDuration: boolean
    sessionLimitMinutes?: number | null
  }>
  summary: {
    total: number
    uniqueMembers: number
    currentInside: number
    averageDurationMinutes: number
  }
  charts: {
    byHour: Array<{ label: string; value: number }>
    byDay: Array<{ label: string; value: number }>
    byVariant: Array<{ label: string; value: number }>
  }
  range: { from: string; to: string; mode: VisitView }
  maxSessionMinutes: number | null
}

const formatInputDate = (date: Date) => date.toISOString().slice(0, 10)
const formatTimeInput = (value: Date) => value.toISOString().slice(11, 16)
const buildDateTimeString = (date: string, time?: string) => {
  if (!date) return null
  const base = time ? new Date(`${date}T${time}`) : new Date(date)
  if (Number.isNaN(base.getTime())) return null
  return base.toISOString()
}

const defaultSummary = {
  total: 0,
  uniqueMembers: 0,
  currentInside: 0,
  averageDurationMinutes: 0,
}

export default function PresencePage() {
  const t = useTranslations("dashboard.presence")
  const tFeatureAccess = useTranslations("dashboard.featureAccess")
  const locale = useLocale()
  const { data: session, status } = useSession()
  const { tier, hasAccessControl, hasPresence, hasCourses, hasExcelReports, hasMultiLocations } = usePlanFeatures()

  const {
    variants,
    selectedVariant,
    setSelectedVariant,
    isGymAdmin,
    lockedVariantId,
    defaultVariantId,
    isLoading: variantsLoading,
  } = useVariantOptions({ allowAll: hasMultiLocations })

  // Fix Translate mismatch (kept exactly as you had it)
  type FeatureTranslate = Parameters<typeof buildFeatureAccessItems>[0]["t"]
  const tFeatureAccessStrict = useMemo<FeatureTranslate>(
    () => ((key: string, values?: Record<string, unknown>) => tFeatureAccess(key as any, values as any)) as any,
    [tFeatureAccess],
  )

  const isMultiVariantGym = variants.length > 1
  const allowAllVariants = hasMultiLocations || !isMultiVariantGym
  const multiVariantLocked = isMultiVariantGym && !hasMultiLocations

  const todayStr = formatInputDate(new Date())
  const lastWeekStr = formatInputDate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000))

  const [view, setView] = useState<VisitView>("day")
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)
  const [from, setFrom] = useState<string>(lastWeekStr)
  const [to, setTo] = useState<string>(todayStr)
  const [search, setSearch] = useState<string>("")

  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false)
  const [checkoutVisitId, setCheckoutVisitId] = useState<string>("")
  const [checkoutDate, setCheckoutDate] = useState<string>(todayStr)
  const [checkoutTime, setCheckoutTime] = useState<string>(formatTimeInput(new Date()))
  const [checkoutWindowStart, setCheckoutWindowStart] = useState<string>("")
  const [checkoutWindowEnd, setCheckoutWindowEnd] = useState<string>("")

  const planLabel = tier === "ENTERPRISE" ? "Enterprise" : tier === "PRO" ? "Pro" : "Basic"

  const featureItems = useMemo(
    () =>
      buildFeatureAccessItems({
        hasAccessControl,
        hasPresence,
        hasCourses,
        hasExcelReports,
        t: tFeatureAccessStrict,
      }),
    [hasAccessControl, hasCourses, hasExcelReports, hasPresence, tFeatureAccessStrict],
  )

  useEffect(() => {
    if (!allowAllVariants && selectedVariant === "all") {
      const fallback = lockedVariantId ?? defaultVariantId ?? variants[0]?.id ?? "all"
      if (fallback && fallback !== "all") {
        setSelectedVariant(fallback)
      }
    }
  }, [allowAllVariants, defaultVariantId, lockedVariantId, selectedVariant, setSelectedVariant, variants])

  const variantFilter =
    isGymAdmin && lockedVariantId
      ? lockedVariantId
      : selectedVariant && selectedVariant !== "all"
        ? selectedVariant
        : allowAllVariants
          ? null
          : (defaultVariantId ?? variants[0]?.id ?? null)

  const visitsQuery = useQuery<VisitAnalyticsResponse>({
    queryKey: ["visits", session?.user?.gymId, variantFilter, view, selectedDate, from, to, search],
    enabled: status === "authenticated" && hasPresence && !variantsLoading,
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set("view", view)
      if (variantFilter) params.set("variantId", variantFilter)
      if (search.trim()) params.set("q", search.trim())

      if (view === "day") {
        params.set("date", selectedDate)
      } else {
        if (from) params.set("from", from)
        if (to) params.set("to", to)
      }

      params.set("limit", "180")

      const response = await fetch(`/api/gym-team/visits?${params.toString()}`)
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || t("errors.load"))
      return body as VisitAnalyticsResponse
    },
  })

  const parsedVisits = useMemo(
    () =>
      (visitsQuery.data?.visits ?? []).map((visit) => ({
        ...visit,
        checkIn: new Date(visit.checkIn),
        checkOut: visit.checkOut ? new Date(visit.checkOut) : null,
        isOverMaxDuration: Boolean(visit.isOverMaxDuration),
        sessionLimitMinutes: visit.sessionLimitMinutes ?? null,
      })),
    [visitsQuery.data?.visits],
  )

  const openVisits = useMemo(() => parsedVisits.filter((visit) => !visit.checkOut), [parsedVisits])
  const summary = visitsQuery.data?.summary ?? defaultSummary
  const charts = visitsQuery.data?.charts ?? { byHour: [], byDay: [], byVariant: [] }

  const selectedOpenVisit = useMemo(
    () => openVisits.find((visit) => visit.id === checkoutVisitId) ?? null,
    [checkoutVisitId, openVisits],
  )

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale === "ar" ? "ar" : "fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    [locale],
  )

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale === "en" ? "en-US" : locale === "ar" ? "ar" : "fr-FR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale],
  )

  useEffect(() => {
    if (openVisits.length === 0) {
      setCheckoutVisitId("")
      return
    }
    const currentSelected = openVisits.find((visit) => visit.id === checkoutVisitId)
    const fallback = currentSelected ?? openVisits[0]
    setCheckoutVisitId(fallback.id)
    setCheckoutDate(formatInputDate(fallback.checkIn))
  }, [checkoutVisitId, openVisits])

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!checkoutVisitId) throw new Error(t("errors.noSelection"))

      const payload: Record<string, any> = { direction: "OUT", visitId: checkoutVisitId }

      const checkoutAtIso = buildDateTimeString(checkoutDate, checkoutTime)
      const windowFromIso = checkoutWindowStart ? buildDateTimeString(checkoutDate, checkoutWindowStart) : null
      const windowToIso = checkoutWindowEnd ? buildDateTimeString(checkoutDate, checkoutWindowEnd) : null

      if (checkoutAtIso) payload.checkoutAt = checkoutAtIso
      if (windowFromIso) payload.rangeFrom = windowFromIso
      if (windowToIso) payload.rangeTo = windowToIso

      const response = await fetch("/api/gym-team/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(body.error || t("errors.checkout"))

      return body as {
        memberName?: string
        isOverMaxDuration?: boolean
        sessionLimitMinutes?: number | null
        durationMinutes?: number
      }
    },
    onSuccess: (data) => {
      const segments: string[] = [t("manualCheckout.toasts.base")]

      if (data?.memberName) segments.push(t("manualCheckout.toasts.member", { memberName: data.memberName }))
      if (typeof data?.durationMinutes === "number")
        segments.push(t("manualCheckout.toasts.duration", { minutes: data.durationMinutes }))

      if (data?.isOverMaxDuration) {
        segments.push(
          typeof data.sessionLimitMinutes === "number"
            ? t("manualCheckout.toasts.limit", { limit: data.sessionLimitMinutes })
            : t("manualCheckout.toasts.overstay"),
        )
      }

      const message = segments.filter(Boolean).join(" ")
      const notify = data?.isOverMaxDuration ? toast.warning : toast.success
      notify(message)

      setCheckoutDialogOpen(false)
      visitsQuery.refetch()
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : t("errors.checkout")
      toast.error(message)
    },
  })

  const resetFilters = () => {
    setView("day")
    setSelectedDate(todayStr)
    setFrom(lastWeekStr)
    setTo(todayStr)
    setSearch("")
  }

  const visitPagination = usePagination(parsedVisits, 12)

  const visitTablePagination = useMemo(
    () => ({
      page: visitPagination.page,
      pageCount: visitPagination.pageCount,
      pageSize: visitPagination.pageSize,
      totalItems: parsedVisits.length,
      onPageChange: visitPagination.setPage,
    }),
    [
      parsedVisits.length,
      visitPagination.page,
      visitPagination.pageCount,
      visitPagination.pageSize,
      visitPagination.setPage,
    ],
  )

  if (status === "loading" || variantsLoading) {
    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-48 rounded-2xl" />
          <Skeleton className="h-10 w-32 rounded-2xl" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-3 rounded-2xl border border-border/60 bg-card/60 p-4 animate-pulse">
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-8 w-32 rounded-lg" />
            </div>
          ))}
        </div>
        <div className="rounded-3xl border border-border/60 bg-card/80 p-6">
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return <div className="text-red-500 font-medium">{t("errors.unauthenticated")}</div>
  }

  if (!hasPresence) {
    return (
      <LockedFeatureState
        title={t("locked.title")}
        description={t("locked.description")}
        planLabel={planLabel}
        items={featureItems}
      />
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="flex items-center gap-3">
          <VariantSelector
            variants={variants}
            value={selectedVariant}
            onChange={setSelectedVariant}
            isGymAdmin={isGymAdmin}
            lockedVariantId={lockedVariantId}
            loading={variantsLoading}
            allowAll={allowAllVariants}
          />

          <Dialog open={checkoutDialogOpen} onOpenChange={setCheckoutDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                onClick={() => setCheckoutDialogOpen(true)}
                disabled={!openVisits.length}
                className="rounded-2xl border-border/60 transition-all hover:scale-105"
              >
                <LogOut className="mr-2 h-4 w-4" />
                {t("manualCheckout.trigger")}
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("manualCheckout.title")}</DialogTitle>
                <DialogDescription>{t("manualCheckout.description")}</DialogDescription>
              </DialogHeader>

              {openVisits.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("manualCheckout.noOpenVisits")}</p>
              ) : (
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="visit-select">{t("manualCheckout.visitLabel")}</Label>
                    <Select value={checkoutVisitId} onValueChange={setCheckoutVisitId}>
                      <SelectTrigger id="visit-select">
                        <SelectValue placeholder={t("manualCheckout.visitPlaceholder")} />
                      </SelectTrigger>
                      <SelectContent>
                        {openVisits.map((visit) => (
                          <SelectItem key={visit.id} value={visit.id}>
                            {visit.memberName} · {dateFormatter.format(visit.checkIn)} {timeFormatter.format(visit.checkIn)} ·{" "}
                            {visit.variantName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="checkout-date">{t("manualCheckout.checkoutDate")}</Label>
                      <Input
                        id="checkout-date"
                        type="date"
                        value={checkoutDate}
                        onChange={(event) => setCheckoutDate(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="checkout-time">{t("manualCheckout.checkoutTime")}</Label>
                      <Input
                        id="checkout-time"
                        type="time"
                        value={checkoutTime}
                        onChange={(event) => setCheckoutTime(event.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="window-from">{t("manualCheckout.windowFrom")}</Label>
                      <Input
                        id="window-from"
                        type="time"
                        value={checkoutWindowStart}
                        onChange={(event) => setCheckoutWindowStart(event.target.value)}
                        placeholder="08:00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="window-to">{t("manualCheckout.windowTo")}</Label>
                      <Input
                        id="window-to"
                        type="time"
                        value={checkoutWindowEnd}
                        onChange={(event) => setCheckoutWindowEnd(event.target.value)}
                        placeholder="22:00"
                      />
                    </div>
                  </div>

                  {selectedOpenVisit ? (
                    <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                      {t("manualCheckout.arrivalInfo", {
                        date: dateFormatter.format(selectedOpenVisit.checkIn),
                        time: timeFormatter.format(selectedOpenVisit.checkIn),
                        variant: selectedOpenVisit.variantName,
                      })}
                    </div>
                  ) : null}
                </div>
              )}

              <DialogFooter className="mt-2">
                <Button variant="outline" onClick={() => setCheckoutDialogOpen(false)} className="border-border/70">
                  {t("manualCheckout.cancel")}
                </Button>
                <Button
                  onClick={() => checkoutMutation.mutate()}
                  disabled={!openVisits.length || checkoutMutation.isPending}
                >
                  {checkoutMutation.isPending ? t("manualCheckout.submitPending") : t("manualCheckout.submit")}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            onClick={() => visitsQuery.refetch()}
            disabled={visitsQuery.isFetching}
            className="rounded-2xl border-border/60 transition-all hover:scale-105"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${visitsQuery.isFetching ? "animate-spin" : ""}`} />
            {visitsQuery.isFetching ? t("actions.refreshing") : t("actions.refresh")}
          </Button>
        </div>
      </div>

      {multiVariantLocked ? (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 shadow-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="font-semibold">{t("multiVariantLocked.title")}</p>
            <p>
              {t("multiVariantLocked.body")}{" "}
              <Link href="/dashboard/settings" className="font-semibold text-amber-900 underline">
                {t("multiVariantLocked.upgrade")}
              </Link>
              .
            </p>
          </div>
        </div>
      ) : null}

      <VisitFilters
        view={view}
        date={selectedDate}
        from={from}
        to={to}
        search={search}
        onViewChange={(next) => {
          setView(next)
          if (next === "day") setSelectedDate(todayStr)
          else {
            setFrom(lastWeekStr)
            setTo(todayStr)
          }
        }}
        onDateChange={setSelectedDate}
        onRangeChange={({ from: nextFrom, to: nextTo }) => {
          setFrom(nextFrom)
          setTo(nextTo)
        }}
        onSearchChange={setSearch}
        onReset={resetFilters}
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("summary.visits")}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-semibold">
            <Activity className="h-5 w-5 text-primary" />
            {summary.total.toLocaleString()}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("summary.unique")}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-semibold">
            <Users className="h-5 w-5 text-primary" />
            {summary.uniqueMembers.toLocaleString()}
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("summary.present")}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-semibold">
            <Badge variant="secondary" className="rounded-full bg-emerald-50 text-emerald-700">
              {summary.currentInside.toLocaleString()}
            </Badge>
            <span className="text-sm text-muted-foreground">{t("summary.pendingCheckout")}</span>
          </CardContent>
        </Card>

        <Card className="overflow-hidden rounded-2xl border border-border/60 bg-card/90 shadow-sm backdrop-blur-sm transition-all hover:-translate-y-1 hover:shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">{t("summary.avgDuration")}</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-semibold">
            <Clock3 className="h-5 w-5 text-primary" />
            {summary.averageDurationMinutes.toFixed(0)} min
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden rounded-3xl border border-border/60 bg-card/90 shadow-md backdrop-blur-sm">
        <CardHeader>
          <CardTitle>{t("charts.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <VisitCharts byHour={charts.byHour} byDay={charts.byDay} byVariant={charts.byVariant} view={view} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden rounded-3xl border border-border/60 bg-card/90 shadow-md backdrop-blur-sm">
        <CardHeader>
          <CardTitle>{t("table.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <VisitTable visits={visitPagination.data} pagination={visitTablePagination} />
        </CardContent>
      </Card>
    </div>
  )
}
