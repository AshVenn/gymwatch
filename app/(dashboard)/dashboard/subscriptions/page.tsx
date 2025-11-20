'use client'

import { useSession } from 'next-auth/react'
import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, MoreVertical, RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PaginationControls, usePagination } from '@/components/dashboard/pagination-controls'
import {
  SubscriptionSummary,
  type SubscriptionSummaryMetrics,
} from '@/components/dashboard/subscriptions/subscription-summary'
import {
  SubscriptionFilters,
  type SortOption,
  type QuickFilter,
} from '@/components/dashboard/subscriptions/subscription-filters'
import { Switch } from '@/components/ui/switch'

interface Subscription {
  id: string
  memberName: string
  planName: string
  startDate: string
  endDate: string
  daysLeft: number
  status: 'ACTIVE' | 'EXPIRES_TODAY' | 'EXPIRED'
  pricePaid: number
}

interface Plan {
  id: string
  name: string
  durationDays?: number
}

type StatusCounterKey = Subscription['status'] | 'ALL'

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
})

const currencyFormatter = new Intl.NumberFormat('fr-MA', {
  style: 'currency',
  currency: 'MAD',
  maximumFractionDigits: 0,
})

const statusQuickFilters: QuickFilter[] = [
  { label: 'Tous', value: 'ALL', count: 0 },
  { label: 'Actifs', value: 'ACTIVE', count: 0 },
  { label: 'Expire ajd.', value: 'EXPIRES_TODAY', count: 0 },
  { label: 'Expires', value: 'EXPIRED', count: 0 },
]

export default function SubscriptionsPage() {
  const { data: session } = useSession()
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [sortBy, setSortBy] = useState<SortOption>('NEXT_EXPIRY')
  const [renewingId, setRenewingId] = useState<string | null>(null)
  const [renewalForm, setRenewalForm] = useState<{
    planId: string
    startDate: string
    createPayment: boolean
  }>({
    planId: '',
    startDate: new Date().toISOString().split('T')[0],
    createPayment: true,
  })

  const gymId = session?.user?.gymId

  const subscriptionQueryKey = useMemo(
    () => ['subscriptions', gymId, { searchTerm, filterStatus }] as const,
    [gymId, searchTerm, filterStatus],
  )
  const plansQueryKey = useMemo(() => ['plans', gymId] as const, [gymId])

  const {
    data: subscriptions = [],
    isLoading,
    isError,
  } = useQuery<Subscription[]>({
    queryKey: subscriptionQueryKey,
    enabled: Boolean(gymId),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      const normalizedStatus = filterStatus === 'ALL' ? '' : filterStatus
      if (normalizedStatus) params.append('status', normalizedStatus)

      const response = await fetch(`/api/subscriptions?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Impossible de charger les abonnements')
      }

      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
  })

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: plansQueryKey,
    enabled: Boolean(gymId),
    queryFn: async () => {
      const response = await fetch('/api/plans')
      if (!response.ok) {
        throw new Error('Impossible de charger les plans')
      }

      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
  })

  const deleteSubscriptionMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const response = await fetch(`/api/subscriptions/${subscriptionId}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Impossible de supprimer cet abonnement')
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionQueryKey })
      toast.success('Abonnement supprime avec succes')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Impossible de supprimer cet abonnement'
      toast.error(message)
    },
  })

  const renewSubscriptionMutation = useMutation({
    mutationFn: async () => {
      if (!renewingId) {
        throw new Error("Aucun abonnement selectionne")
      }

      const response = await fetch(`/api/subscriptions/${renewingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: renewalForm.planId,
          startDate: renewalForm.startDate || new Date().toISOString().split('T')[0],
          createPayment: renewalForm.createPayment,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || "Impossible de renouveler l'abonnement")
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionQueryKey })
      setRenewingId(null)
      setRenewalForm({ planId: '', startDate: new Date().toISOString().split('T')[0], createPayment: true })
      toast.success('Abonnement mis a jour')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : "Impossible de renouveler l'abonnement"
      toast.error(message)
    },
  })

  const summaryMetrics: SubscriptionSummaryMetrics = useMemo(() => {
    const list = subscriptions ?? []
    if (!list.length) {
      return {
        totalRevenue: 0,
        active: 0,
        expired: 0,
        expiringSoon: 0,
        avgTicket: 0,
        retentionRate: 0,
      }
    }

    let revenue = 0
    let active = 0
    let expired = 0
    let expiringSoon = 0

    list.forEach((sub) => {
      revenue += sub.pricePaid ?? 0
      if (sub.status === 'ACTIVE') active += 1
      if (sub.status === 'EXPIRED') expired += 1
      if (sub.daysLeft >= 0 && sub.daysLeft <= 5) expiringSoon += 1
    })

    return {
      totalRevenue: revenue,
      active,
      expired,
      expiringSoon,
      avgTicket: list.length ? revenue / list.length : 0,
      retentionRate: list.length ? Math.round((active / list.length) * 100) : 0,
    }
  }, [subscriptions])

  const statusCounters = useMemo(() => {
    const initial: Record<StatusCounterKey, number> = {
      ALL: 0,
      ACTIVE: 0,
      EXPIRES_TODAY: 0,
      EXPIRED: 0,
    }

    return (subscriptions ?? []).reduce((acc, sub) => {
      acc.ALL += 1
      acc[sub.status] = (acc[sub.status] ?? 0) + 1
      return acc
    }, initial)
  }, [subscriptions])

  const quickFilters: QuickFilter[] = statusQuickFilters.map((filter) => ({
    ...filter,
    count: filter.value === 'ALL' ? statusCounters.ALL : statusCounters[filter.value as Subscription['status']] ?? 0,
  }))

  const filteredSubscriptions = useMemo(() => {
    const normalizedStatus = filterStatus === 'ALL' ? undefined : filterStatus
    const normalizedSearch = searchTerm.trim().toLowerCase()

    const matches = (value?: string | null) =>
      !normalizedSearch || value?.toLowerCase().includes(normalizedSearch)

    const list = (subscriptions ?? []).filter((sub) => {
      const matchesStatus = normalizedStatus ? sub.status === normalizedStatus : true
      const matchesSearch = matches(sub.memberName) || matches(sub.planName)
      return matchesStatus && matchesSearch
    })

    const getTime = (value: string) => {
      const parsed = new Date(value)
      return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime()
    }

    return list.sort((a, b) => {
      switch (sortBy) {
        case 'PRICE_DESC':
          return (b.pricePaid ?? 0) - (a.pricePaid ?? 0)
        case 'RECENT_START':
          return getTime(b.startDate) - getTime(a.startDate)
        default:
          return getTime(a.endDate) - getTime(b.endDate)
      }
    })
  }, [subscriptions, filterStatus, searchTerm, sortBy])

  const subscriptionPagination = usePagination(filteredSubscriptions, 10)

  const handleDeleteSubscription = (subscriptionId: string) => {
    if (!subscriptionId) return

    if (confirm('Etes-vous sur de vouloir supprimer cet abonnement ?')) {
      deleteSubscriptionMutation.mutate(subscriptionId)
    }
  }

  const handleRenewalSubmit = () => {
    if (!renewalForm.planId) {
      toast.error('Veuillez selectionner un plan.')
      return
    }

    if (!renewalForm.startDate) {
      toast.error('Veuillez choisir une date de debut.')
      return
    }

    renewSubscriptionMutation.mutate()
  }

  const safeDate = (value: string | null | undefined) => {
    if (!value) return '-'
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) return '-'
    return dateFormatter.format(parsed)
  }

  const getStatusBadge = (status: Subscription['status']) => {
    const base = 'border border-border/60 text-xs font-semibold uppercase tracking-wider'

    if (status === 'ACTIVE') {
      return <Badge className={cn(base, 'bg-primary/10 text-primary')}>Actif</Badge>
    }

    if (status === 'EXPIRES_TODAY') {
      return <Badge className={cn(base, 'bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-50')}>Expire aujourd hui</Badge>
    }

    if (status === 'EXPIRED') {
      return <Badge className={cn(base, 'bg-destructive/20 text-destructive')}>Expire</Badge>
    }

    return <Badge className={base}>{status}</Badge>
  }

  const selectedPlan = plans.find((plan) => plan.id === renewalForm.planId)
  const endPreview =
    selectedPlan && renewalForm.startDate
      ? (() => {
          const end = new Date(renewalForm.startDate)
          if (selectedPlan.durationDays) {
            end.setDate(end.getDate() + selectedPlan.durationDays)
          }
          return end
        })()
      : null

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-56 animate-pulse rounded-3xl bg-muted/40" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-2xl bg-muted/30" />
          ))}
        </div>
        <div className="h-[420px] animate-pulse rounded-3xl bg-muted/30" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <SubscriptionSummary metrics={summaryMetrics} />

      {isError && (
        <div className="flex items-center gap-3 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-destructive">
          Impossible de charger les abonnements.
        </div>
      )}

      <SubscriptionFilters
        searchTerm={searchTerm}
        onSearch={setSearchTerm}
        filterStatus={filterStatus}
        onStatusChange={setFilterStatus}
        sortBy={sortBy}
        onSortChange={setSortBy}
        quickFilters={quickFilters}
        onQuickFilter={setFilterStatus}
      />

      <div className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
        {subscriptionPagination.data.length ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-6 py-4 text-sm text-muted-foreground">
              <span>
                {filteredSubscriptions.length} abonnement{filteredSubscriptions.length > 1 ? 's' : ''} trouves
              </span>
              <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Page {subscriptionPagination.page} / {subscriptionPagination.pageCount}
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="text-muted-foreground">
                  <TableHead>Adherent</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Debut</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Restant</TableHead>
                  <TableHead className="text-right">Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {subscriptionPagination.data.map((sub) => (
                  <TableRow
                    key={sub.id}
                    className={cn(
                      'border-border/60 text-foreground transition-colors hover:bg-muted/40',
                      sub.status === 'EXPIRED' && 'bg-destructive/10',
                      sub.status === 'EXPIRES_TODAY' && 'bg-amber-100/30 dark:bg-amber-500/10',
                    )}
                  >
                    <TableCell className="font-semibold">
                      <div>{sub.memberName ?? '-'}</div>
                      <div className="text-xs text-muted-foreground">#{sub.id.slice(0, 8)}</div>
                    </TableCell>
                    <TableCell>{sub.planName ?? '-'}</TableCell>
                    <TableCell>{safeDate(sub.startDate)}</TableCell>
                    <TableCell>{safeDate(sub.endDate)}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'text-sm font-semibold',
                          sub.daysLeft < 0
                            ? 'text-destructive'
                            : sub.daysLeft <= 5
                              ? 'text-amber-600 dark:text-amber-300'
                              : 'text-primary',
                        )}
                      >
                        {sub.daysLeft < 0 ? `${Math.abs(sub.daysLeft)} j de retard` : `${sub.daysLeft} j restants`}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {sub.pricePaid ? currencyFormatter.format(sub.pricePaid) : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(sub.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>

                        <DropdownMenuContent align="end" className="w-48 border border-border/60 bg-card text-foreground">
                          <Dialog open={renewingId === sub.id} onOpenChange={(open) => !open && setRenewingId(null)}>
                            <DialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(event) => {
                                  event.preventDefault()
                                  setRenewingId(sub.id)
                                  setRenewalForm({
                                    planId: '',
                                    startDate: new Date().toISOString().split('T')[0],
                                    createPayment: true,
                                  })
                                }}
                              >
                                <RotateCcw className="mr-2" size={16} />
                                Modifier / renouveler
                              </DropdownMenuItem>
                            </DialogTrigger>

                            <DialogContent className="border-border/60 bg-card text-foreground">
                              <DialogHeader>
                                <DialogTitle>Mettre a jour l abonnement</DialogTitle>
                              </DialogHeader>

                              <div className="space-y-4">
                                <div>
                                  <Label htmlFor="renew-plan" className="text-foreground">
                                    Plan
                                  </Label>
                                  <Select
                                    value={renewalForm.planId}
                                    onValueChange={(value) => setRenewalForm({ ...renewalForm, planId: value })}
                                  >
                                    <SelectTrigger id="renew-plan" className="mt-1">
                                      <SelectValue placeholder="Selectionner un plan" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(plans ?? []).map((plan) => (
                                        <SelectItem key={plan.id} value={plan.id}>
                                          {plan.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label className="text-foreground">Date de debut</Label>
                                  <Input
                                    type="date"
                                    value={renewalForm.startDate}
                                    onChange={(e) => setRenewalForm({ ...renewalForm, startDate: e.target.value })}
                                  />
                                  {endPreview && (
                                    <p className="text-xs text-muted-foreground">
                                      Fin estimee: {dateFormatter.format(endPreview)}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center justify-between rounded-md border border-border/60 p-3">
                                  <div className="space-y-0.5">
                                    <p className="text-sm font-medium">Creer un paiement</p>
                                    <p className="text-xs text-muted-foreground">
                                      Desactivez si vous corrigez une erreur de date.
                                    </p>
                                  </div>
                                  <Switch
                                    checked={renewalForm.createPayment}
                                    onCheckedChange={(checked) =>
                                      setRenewalForm({ ...renewalForm, createPayment: checked })
                                    }
                                  />
                                </div>

                                <Button
                                  className="w-full"
                                  onClick={handleRenewalSubmit}
                                  disabled={renewSubscriptionMutation.isPending}
                                >
                                  {renewSubscriptionMutation.isPending ? 'Mise a jour...' : 'Sauvegarder'}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>

                          <DropdownMenuItem
                            onClick={() => handleDeleteSubscription(sub.id)}
                            className="text-destructive focus:bg-destructive/10"
                          >
                            <Trash2 className="mr-2" size={16} />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="border-t border-border/60 px-4 py-4">
              <PaginationControls
                page={subscriptionPagination.page}
                pageCount={subscriptionPagination.pageCount}
                pageSize={subscriptionPagination.pageSize}
                onPageChange={subscriptionPagination.setPage}
                totalItems={filteredSubscriptions.length}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 px-10 py-24 text-center text-muted-foreground">
            <AlertTriangle className="h-10 w-10 text-primary" />
            <p className="text-lg font-semibold">Aucun abonnement ne correspond a vos filtres.</p>
            <p className="text-sm text-muted-foreground">
              Ajustez la recherche ou le statut pour afficher d'autres membres.
            </p>
            <Button variant="outline" onClick={() => setFilterStatus('ALL')}>
              Reinitialiser les filtres
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
