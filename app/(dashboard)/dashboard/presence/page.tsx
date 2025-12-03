'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, Clock3, RefreshCw, Users } from 'lucide-react'

import { usePlanFeatures } from '@/app/hooks/use-plan-features'
import { useVariantOptions } from '@/app/hooks/use-variants'
import { VisitCharts } from '@/components/dashboard/visits/charts'
import { VisitFilters } from '@/components/dashboard/visits/filters'
import { VisitTable } from '@/components/dashboard/visits/visit-table'
import { VariantSelector } from '@/components/dashboard/variant-selector'
import { buildFeatureAccessItems, LockedFeatureState } from '@/components/dashboard/feature-access-grid'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

type VisitView = 'day' | 'period'

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
}

const formatInputDate = (date: Date) => date.toISOString().slice(0, 10)

const defaultSummary = {
  total: 0,
  uniqueMembers: 0,
  currentInside: 0,
  averageDurationMinutes: 0,
}

export default function PresencePage() {
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
  const isMultiVariantGym = variants.length > 1
  const allowAllVariants = hasMultiLocations || !isMultiVariantGym
  const multiVariantLocked = isMultiVariantGym && !hasMultiLocations

  const todayStr = formatInputDate(new Date())
  const lastWeekStr = formatInputDate(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000))

  const [view, setView] = useState<VisitView>('day')
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)
  const [from, setFrom] = useState<string>(lastWeekStr)
  const [to, setTo] = useState<string>(todayStr)
  const [search, setSearch] = useState<string>('')
  const planLabel = tier === 'COMPLEX' ? 'Complex' : tier === 'PRO' ? 'Pro' : 'Basic'
  const featureItems = useMemo(
    () =>
      buildFeatureAccessItems({
        hasAccessControl,
        hasPresence,
        hasCourses,
        hasExcelReports,
      }),
    [hasAccessControl, hasCourses, hasExcelReports, hasPresence],
  )

  useEffect(() => {
    if (!allowAllVariants && selectedVariant === 'all') {
      const fallback = lockedVariantId ?? defaultVariantId ?? variants[0]?.id ?? 'all'
      if (fallback && fallback !== 'all') {
        setSelectedVariant(fallback)
      }
    }
  }, [allowAllVariants, defaultVariantId, lockedVariantId, selectedVariant, setSelectedVariant, variants])

  const variantFilter =
    isGymAdmin && lockedVariantId
      ? lockedVariantId
      : selectedVariant && selectedVariant !== 'all'
        ? selectedVariant
        : allowAllVariants
          ? null
          : defaultVariantId ?? variants[0]?.id ?? null

  const visitsQuery = useQuery<VisitAnalyticsResponse>({
    queryKey: ['visits', session?.user?.gymId, variantFilter, view, selectedDate, from, to, search],
    enabled: status === 'authenticated' && hasPresence && !variantsLoading,
    queryFn: async () => {
      const params = new URLSearchParams()
      params.set('view', view)
      if (variantFilter) params.set('variantId', variantFilter)
      if (search.trim()) params.set('q', search.trim())
      if (view === 'day') {
        params.set('date', selectedDate)
      } else {
        if (from) params.set('from', from)
        if (to) params.set('to', to)
      }
      params.set('limit', '180')

      const response = await fetch(`/api/visits?${params.toString()}`)
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.error || 'Impossible de charger les visites')
      }
      return body as VisitAnalyticsResponse
    },
  })

  const parsedVisits = useMemo(
    () =>
      (visitsQuery.data?.visits ?? []).map((visit) => ({
        ...visit,
        checkIn: new Date(visit.checkIn),
        checkOut: visit.checkOut ? new Date(visit.checkOut) : null,
      })),
    [visitsQuery.data?.visits],
  )
  const summary = visitsQuery.data?.summary ?? defaultSummary
  const charts = visitsQuery.data?.charts ?? { byHour: [], byDay: [], byVariant: [] }

  const resetFilters = () => {
    setView('day')
    setSelectedDate(todayStr)
    setFrom(lastWeekStr)
    setTo(todayStr)
    setSearch('')
  }

  if (status === 'loading' || variantsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <div className="text-red-500 font-medium">Accès refusé.</div>
  }

  if (!hasPresence) {
    return (
      <LockedFeatureState
        title="Suivi de presence desactive sur ce plan"
        description="La presence temps reel et les courbes de frequentation sont disponibles a partir du plan Pro."
        planLabel={planLabel}
        items={featureItems}
      />
    )
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Suivi de présence</h1>
          <p className="text-muted-foreground">
            Visualisez les passages par salle et suivez la fréquentation au quotidien.
          </p>
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
          <Button
            variant="outline"
            onClick={() => visitsQuery.refetch()}
            disabled={visitsQuery.isFetching}
            className="border-border/70"
          >
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" hidden={!visitsQuery.isFetching} />
            {visitsQuery.isFetching ? 'Actualisation...' : 'Actualiser'}
          </Button>
        </div>
      </div>

      {multiVariantLocked ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="font-semibold">Aggregation multi-salles verrouillee</p>
            <p>
              Les statistiques consolidees sont reservees au plan Complex. Selectionnez une salle ou{' '}
              <Link href="/dashboard/settings" className="font-semibold text-amber-900 underline">mettez a niveau</Link>{' '}
              pour debloquer la vue reseau.
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
          if (next === 'day') {
            setSelectedDate(todayStr)
          } else {
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
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Visites</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-semibold">
            <Activity className="h-5 w-5 text-primary" />
            {summary.total.toLocaleString()}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Visiteurs uniques</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-semibold">
            <Users className="h-5 w-5 text-primary" />
            {summary.uniqueMembers.toLocaleString()}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Présents</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-semibold">
            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700">
              {summary.currentInside.toLocaleString()}
            </Badge>
            <span className="text-sm text-muted-foreground">Sortie non scannée</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Durée moyenne</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2 text-2xl font-semibold">
            <Clock3 className="h-5 w-5 text-primary" />
            {summary.averageDurationMinutes} min
          </CardContent>
        </Card>
      </div>

      {visitsQuery.isError ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          Impossible de charger les visites.
        </div>
      ) : null}

      <VisitCharts
        view={view}
        byHour={charts.byHour}
        byDay={charts.byDay}
        byVariant={charts.byVariant}
        loading={visitsQuery.isLoading}
      />

      {visitsQuery.isLoading ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Dernières visites</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      ) : (
        <VisitTable visits={parsedVisits} />
      )}
    </div>
  )
}
