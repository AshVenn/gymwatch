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
        throw new Error(body.error || 'Impossible de charger les accès')
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
      toast.success('Évènement supprimé')
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
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return <div className="text-red-500 font-medium">Accès refusé.</div>
  }

  if (!hasAccessControl) {
    return (
      <LockedFeatureState
        title="Controle d'acces reserve au plan Pro ou Complex"
        description="Le journal des acces, les simulations QR et le marquage en direct sont inclus a partir du plan Pro."
        planLabel={planLabel}
        items={featureItems}
      />
    )
  }


  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Journaux d&apos;accès</h1>
          <p className="text-muted-foreground">
            Historique des scans QR, simulations et marquages manuels.
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
            onClick={() => accessLogsQuery.refetch()}
            disabled={accessLogsQuery.isFetching}
          >
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" hidden={!accessLogsQuery.isFetching} />
            {accessLogsQuery.isFetching ? 'Actualisation...' : 'Actualiser'}
          </Button>
        </div>
      </div>

      {multiVariantLocked ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="font-semibold">Aggregation multi-salles verrouillee</p>
            <p>
              Les journaux consolides sont reserves au plan Complex. Selectionnez une salle ou{' '}
              <Link href="/dashboard/settings" className="font-semibold text-amber-900 underline">mettez a niveau</Link>{' '}
              pour debloquer la vue reseau.
            </p>
          </div>
        </div>
      ) : null}

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Accès autorisés</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <span className="text-2xl font-semibold">{summary.granted}</span>
            <Badge variant="outline" className="border-emerald-200 text-emerald-700">
              {summary.successRate}% ok
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Refus</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-red-600 dark:text-red-300">
            {summary.denied}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Déjà comptés</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-amber-600 dark:text-amber-300">
            {summary.already}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Sorties</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-sky-700 dark:text-sky-300">
            {summary.checkouts}
          </CardContent>
        </Card>
      </div>

      {accessLogsQuery.isError ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4" />
          Impossible de charger les accès.
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-col gap-1 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-base text-muted-foreground">
            {events.length} évènement{events.length > 1 ? 's' : ''} (limité aux 200 derniers)
          </CardTitle>
          {sessionLimit ? (
            <Badge variant="outline" className="border-destructive/40 bg-destructive/5 text-xs text-muted-foreground">
              Durée max: {sessionLimit} min
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          {accessLogsQuery.isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
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
