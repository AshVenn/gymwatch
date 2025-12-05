'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AccessEventSource, AccessEventStatus } from '@prisma/client'
import { toast } from 'sonner'
import { AlertTriangle, RefreshCw } from 'lucide-react'

import { AccessLogFilters } from '@/components/dashboard/access-logs/filters'
import { AccessLogTable, type AccessLogRow } from '@/components/dashboard/access-logs/table'
import { buildFeatureAccessItems, LockedFeatureState } from '@/components/dashboard/feature-access-grid'
import { PaginationControls, usePagination } from '@/components/dashboard/pagination-controls'
import { VariantSelector } from '@/components/dashboard/variant-selector'
import { usePlanFeatures } from '@/app/hooks/use-plan-features'
import { useVariantOptions } from '@/app/hooks/use-variants'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

const statusOptions = [
  { value: 'ALL', label: 'Tous les statuts' },
  { value: AccessEventStatus.GRANTED, label: 'Acces autorise' },
  { value: AccessEventStatus.CHECKED_OUT, label: 'Sortie enregistree' },
  { value: AccessEventStatus.ALREADY_CHECKED_IN, label: 'Deja compte' },
  { value: AccessEventStatus.DENIED_EXPIRED, label: 'Abonnement expire' },
  { value: AccessEventStatus.DENIED_INACTIVE, label: 'Abonnement inactif' },
  { value: AccessEventStatus.DENIED_FORBIDDEN, label: 'Non autorise' },
]

const sourceOptions = [
  { value: 'ALL', label: 'Toutes les sources' },
  { value: AccessEventSource.QR_SCAN, label: 'Scan QR' },
  { value: AccessEventSource.SIMULATOR, label: 'Simulateur' },
  { value: AccessEventSource.MANUAL, label: 'Marquage manuel' },
]

type AccessLogResponse = {
  events: AccessLogRow[]
  maxSessionMinutes: number | null
}

export default function AccessLogsPage() {
  const { data: session, status } = useSession()
  const { tier, hasAccessControl, hasPresence, hasCourses, hasExcelReports, hasMultiLocations } = usePlanFeatures()
  const queryClient = useQueryClient()

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

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [sourceFilter, setSourceFilter] = useState<string>('ALL')
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [deletingId, setDeletingId] = useState<string | null>(null)

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

  const accessLogsQuery = useQuery<AccessLogResponse>({
    queryKey: [
      'access-events',
      session?.user?.gymId,
      variantFilter,
      statusFilter,
      sourceFilter,
      from,
      to,
      search,
    ],
    enabled: status === 'authenticated' && hasAccessControl && !variantsLoading,
    queryFn: async () => {
      const params = new URLSearchParams()
      if (variantFilter) params.set('variantId', variantFilter)
      if (statusFilter !== 'ALL') params.set('status', statusFilter)
      if (sourceFilter !== 'ALL') params.set('source', sourceFilter)
      if (search.trim()) params.set('q', search.trim())
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      params.set('limit', '200')

      const response = await fetch(`/api/access-events?${params.toString()}`)
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.error || 'Impossible de charger les acces')
      }
      return {
        events: (body.events as AccessLogRow[] | undefined) ?? [],
        maxSessionMinutes:
          typeof body.maxSessionMinutes === 'number' && body.maxSessionMinutes > 0
            ? body.maxSessionMinutes
            : null,
      }
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await fetch(`/api/access-events/${eventId}`, {
        method: 'DELETE',
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.error || 'Suppression impossible')
      }
      return true
    },
    onMutate: (eventId: string) => {
      setDeletingId(eventId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-events'] })
      toast.success('Evenement supprime')
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Suppression impossible'
      toast.error(message)
    },
    onSettled: () => {
      setDeletingId(null)
    },
  })

  const events = useMemo(() => accessLogsQuery.data?.events ?? [], [accessLogsQuery.data?.events])
  const sessionLimit = accessLogsQuery.data?.maxSessionMinutes ?? null
  const pagination = usePagination(events, 12)

  const summary = useMemo(() => {
    const granted = events.filter((event) => event.status === AccessEventStatus.GRANTED).length
    const checkouts = events.filter((event) => event.status === AccessEventStatus.CHECKED_OUT).length
    const denied = events.filter((event) =>
      [AccessEventStatus.DENIED_EXPIRED, AccessEventStatus.DENIED_INACTIVE, AccessEventStatus.DENIED_FORBIDDEN].includes(event.status),
    ).length
    const already = events.filter((event) => event.status === AccessEventStatus.ALREADY_CHECKED_IN).length
    const entryEvents = events.length - checkouts

    return {
      total: events.length,
      granted,
      denied,
      already,
      checkouts,
      successRate: entryEvents > 0 ? Math.round((granted / entryEvents) * 100) : 0,
    }
  }, [events])

  const resetFilters = () => {
    setSearch('')
    setStatusFilter('ALL')
    setSourceFilter('ALL')
    setFrom('')
    setTo('')
  }

  if (status === 'loading' || variantsLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <div className="text-sm font-medium text-destructive">Acces refuse.</div>
  }

  if (!hasAccessControl) {
    return (
      <LockedFeatureState
        title="Controle d'acces non inclus"
        description="Le journal des acces est disponible a partir du plan Pro."
        planLabel={planLabel}
        items={featureItems}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">Journaux d'acces</h1>
          <p className="text-sm text-muted-foreground">Derniers passages, scans et marquages.</p>
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
            size="sm"
            onClick={() => accessLogsQuery.refetch()}
            disabled={accessLogsQuery.isFetching}
            className="rounded-lg"
          >
            <RefreshCw
              className="mr-2 h-4 w-4"
              hidden={!accessLogsQuery.isFetching}
            />
            {accessLogsQuery.isFetching ? 'Actualisation...' : 'Actualiser'}
          </Button>
        </div>
      </div>

      {/* Multi-variant notice – neutral & minimal */}
      {multiVariantLocked ? (
        <div className="flex items-start gap-2 rounded-xl border border-border/70 bg-muted/60 px-4 py-3 text-xs sm:text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-0.5">
            <p className="font-medium text-foreground">Vue multi-salles indisponible</p>
            <p>
              Selectionnez une salle pour voir ses journaux. La vue combinee est incluse dans le plan Complex.
            </p>
          </div>
        </div>
      ) : null}

      {/* Filters */}
      <AccessLogFilters
        search={search}
        status={statusFilter}
        source={sourceFilter}
        from={from}
        to={to}
        statusOptions={statusOptions}
        sourceOptions={sourceOptions}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
        onSourceChange={setSourceFilter}
        onDateChange={({ from: nextFrom, to: nextTo }) => {
          setFrom(nextFrom ?? '')
          setTo(nextTo ?? '')
        }}
        onReset={resetFilters}
      />

      {/* Summary cards – neutral look */}
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
        <Card className="rounded-xl border-border/70">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.total}</CardContent>
        </Card>

        <Card className="rounded-xl border-border/70">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Acces autorises</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <span className="text-2xl font-semibold">{summary.granted}</span>
            <Badge
              variant="outline"
              className="border-border/70 bg-transparent text-[11px] font-normal text-muted-foreground"
            >
              {summary.successRate}% des entrees
            </Badge>
          </CardContent>
        </Card>

        <Card className="rounded-xl border-border/70">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Refus</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.denied}</CardContent>
        </Card>

        <Card className="rounded-xl border-border/70">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Deja comptes</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.already}</CardContent>
        </Card>

        <Card className="rounded-xl border-border/70">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Sorties</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.checkouts}</CardContent>
        </Card>
      </div>

      {/* Error message – still visible but simple */}
      {accessLogsQuery.isError ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs sm:text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          <span>Impossible de charger les acces.</span>
        </div>
      ) : null}

      {/* Table */}
      <Card className="rounded-xl border-border/70">
        <CardHeader className="flex flex-col gap-1 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {events.length} evenement{events.length > 1 ? 's' : ''} (200 derniers)
          </CardTitle>
          {sessionLimit ? (
            <Badge
              variant="outline"
              className="border-border/60 bg-transparent text-[11px] font-normal text-muted-foreground"
            >
              Duree max: {sessionLimit} min
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {accessLogsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : (
            <>
              <AccessLogTable
                events={pagination.data}
                onDelete={deleteMutation.mutate}
                deletingId={deleteMutation.isPending ? deletingId : null}
              />
              <PaginationControls
                page={pagination.page}
                pageCount={pagination.pageCount}
                pageSize={pagination.pageSize}
                totalItems={events.length}
                onPageChange={pagination.setPage}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
