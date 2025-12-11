'use client'

import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MoreVertical, Plus, Edit2, Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PaginationControls, usePagination } from '@/components/dashboard/pagination-controls'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useVariantOptions } from '@/app/hooks/use-variants'
import { VariantSelector } from '@/components/dashboard/variant-selector'
import { Skeleton } from '@/components/ui/skeleton'

interface Plan {
  id: string
  name: string
  durationDays: number
  price: number
  isActive: boolean
  visitsPerDay: number
  maxSessionMinutes?: number | null
  gymVariantId?: string
  gymVariant?: { id: string; name: string; slug: string; isDefault?: boolean }
}

interface GymPlanLimits {
  planLimits?: {
    perVariant: number | null
    perNetwork: number | null
    unlimitedPerVariant: boolean
    unlimitedPerNetwork: boolean
  }
}

export default function PlansPage() {
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const gymId = session?.user?.gymId ?? null
  const {
    variants,
    selectedVariant,
    setSelectedVariant,
    isGymAdmin,
    lockedVariantId,
    defaultVariantId,
    isLoading: variantsLoading,
  } = useVariantOptions()

  const { data: gymInfo } = useQuery<GymPlanLimits>({
    queryKey: ['gym', 'plan-limits', gymId],
    enabled: Boolean(gymId),
    queryFn: async () => {
      const response = await fetch('/api/gym')
      const body = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(body.error || 'Impossible de charger les limites des plans')
      }
      return body as GymPlanLimits
    },
  })

  const [planVariantId, setPlanVariantId] = useState<string>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    durationDays: '',
    price: '',
    isActive: true,
    visitsPerDay: '',
    unlimitedVisits: false,
    maxSessionMinutes: '',
  })
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const effectivePlanVariantId = useMemo(
    () =>
      planVariantId ||
      (selectedVariant !== 'all' ? selectedVariant : '') ||
      defaultVariantId ||
      variants[0]?.id ||
      '',
    [defaultVariantId, planVariantId, selectedVariant, variants],
  )

  useEffect(() => {
    if (editingId) return
    if (isGymAdmin && lockedVariantId) {
      setPlanVariantId(lockedVariantId)
      return
    }
    if (selectedVariant && selectedVariant !== 'all') {
      setPlanVariantId(selectedVariant)
    } else if (defaultVariantId) {
      setPlanVariantId(defaultVariantId)
    }
  }, [defaultVariantId, editingId, isGymAdmin, lockedVariantId, selectedVariant])

  const variantFilter = selectedVariant === 'all' ? null : selectedVariant
  const planQueryKey = useMemo(
    () => ['plans', gymId, variantFilter] as const,
    [gymId, variantFilter],
  )

  const { data: plans = [], isError, isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: planQueryKey,
    enabled: status === 'authenticated' && Boolean(gymId),
    queryFn: async () => {
      const params = new URLSearchParams()
      if (variantFilter) {
        params.set('variantId', variantFilter)
      }
      const response = await fetch(`/api/plans${params.toString() ? `?${params.toString()}` : ''}`)

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Non autorise. Session expiree ?')
        }

        throw new Error('Erreur serveur.')
      }

      const data = await response.json()
      return Array.isArray(data) ? data : []
    },
  })

  const planPagination = usePagination(plans, 10)

  const planStats = useMemo(() => {
    const active = plans.filter((plan) => plan.isActive).length
    const inactive = plans.length - active
    return { total: plans.length, active, inactive }
  }, [plans])

  const activePlans = useMemo(() => plans.filter((plan) => plan.isActive), [plans])
  const activeVariantCount = useMemo(() => {
    if (!effectivePlanVariantId) return activePlans.length
    return activePlans.filter((plan) => plan.gymVariantId === effectivePlanVariantId).length
  }, [activePlans, effectivePlanVariantId])

  const planLimits = gymInfo?.planLimits
  const variantLimit = planLimits?.perVariant ?? null
  const networkLimit = planLimits?.perNetwork ?? null
  const computeCapState = (limit: number | null, count: number) => {
    if (limit === null || limit < 0) return 'OK'
    if (count >= limit) return 'BLOCKED'
    if (count >= limit - 1) return 'WARNING'
    return 'OK'
  }
  const variantCapState = computeCapState(variantLimit, activeVariantCount)
  const networkCapState = computeCapState(networkLimit, activePlans.length)
  const capBlocked = variantCapState === 'BLOCKED' || networkCapState === 'BLOCKED'
  const capWarning = !capBlocked && (variantCapState === 'WARNING' || networkCapState === 'WARNING')
  const formatLimitLabel = (limit: number | null, unlimited?: boolean) =>
    unlimited || limit === null || limit < 0 ? 'Illimite' : String(limit)

  const selectedVariantLimit = useMemo(() => {
    const variant = variants.find((entry) => entry.id === effectivePlanVariantId)
    return variant?.maxSessionMinutes ?? null
  }, [effectivePlanVariantId, variants])

  const handleAddPlan = () => {
    if (capBlocked) {
      toast.error('Limite de plans atteinte pour votre configuration. Desactivez un plan ou upgradez.')
      return
    }
    if (capWarning) {
      toast.warning('Derniere creation active disponible sur ce perimetre.')
    }
    setEditingId(null)
    setFormData({
      name: '',
      durationDays: '',
      price: '',
      isActive: true,
      visitsPerDay: '1',
      unlimitedVisits: false,
      maxSessionMinutes: '',
    })
    const fallbackVariant =
      (selectedVariant !== 'all' ? selectedVariant : '') ||
      lockedVariantId ||
      defaultVariantId ||
      variants[0]?.id ||
      ''
    setPlanVariantId(fallbackVariant)
    setIsOpen(true)
  }

  const handleEditPlan = (plan: Plan) => {
    setEditingId(plan.id)
    const unlimited = typeof plan.visitsPerDay === 'number' && plan.visitsPerDay < 0
    setFormData({
      name: plan.name,
      durationDays: String(plan.durationDays),
      price: String(plan.price),
      isActive: plan.isActive,
      visitsPerDay: unlimited ? '' : String(plan.visitsPerDay ?? 1),
      unlimitedVisits: unlimited,
      maxSessionMinutes: plan.maxSessionMinutes ? String(plan.maxSessionMinutes) : '',
    })
    setPlanVariantId(plan.gymVariantId ?? plan.gymVariant?.id ?? lockedVariantId ?? '')
    setIsOpen(true)
  }

  const savePlanMutation = useMutation({
    mutationFn: async (payload: { visitsPerDay: number; maxSessionMinutes: number | null }) => {
      const method = editingId ? 'PUT' : 'POST'
      const url = editingId ? `/api/plans/${editingId}` : '/api/plans'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          durationDays: parseInt(formData.durationDays, 10),
          price: parseFloat(formData.price),
          isActive: formData.isActive,
          gymVariantId: effectivePlanVariantId || undefined,
          visitsPerDay: payload.visitsPerDay,
          maxSessionMinutes: payload.maxSessionMinutes,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        const detail = (data as any)?.message || data.error
        throw new Error(detail || 'Erreur lors de la sauvegarde')
      }

      return data
    },
    onSuccess: () => {
      setError(null)
      setIsOpen(false)
      setFormData({
        name: '',
        durationDays: '',
        price: '',
        isActive: true,
        visitsPerDay: '1',
        unlimitedVisits: false,
        maxSessionMinutes: '',
      })
      setEditingId(null)
      queryClient.invalidateQueries({ queryKey: planQueryKey })
      toast.success(editingId ? 'Plan mis a jour avec succes' : 'Plan cree avec succes')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Erreur lors de la sauvegarde.'
      setError(message)
      toast.error(message)
    },
  })

  const deletePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const response = await fetch(`/api/plans/${planId}`, { method: 'DELETE' })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Impossible de supprimer le plan.')
      }

      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planQueryKey })
      toast.success('Plan supprime avec succes')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Erreur lors de la suppression.'
      setError(message)
      toast.error(message)
    },
  })

  const handleSubmit = () => {
    if (!effectivePlanVariantId) {
      toast.error('Choisissez une variante pour ce plan.')
      return
    }
    const parsedVisits = formData.unlimitedVisits ? -1 : parseInt(formData.visitsPerDay, 10)
    if (!formData.unlimitedVisits && (!Number.isFinite(parsedVisits) || parsedVisits < 1)) {
      toast.error('Nombre de visites par jour invalide.')
      return
    }
    const trimmedLimit = formData.maxSessionMinutes.trim()
    let parsedSessionLimit: number | null = null
    if (trimmedLimit) {
      const numericLimit = Number(trimmedLimit)
      if (!Number.isFinite(numericLimit) || numericLimit <= 0) {
        toast.error('Durée max de session invalide.')
        return
      }
      parsedSessionLimit = Math.trunc(numericLimit)
    }
    savePlanMutation.mutate({ visitsPerDay: parsedVisits, maxSessionMinutes: parsedSessionLimit })
  }

  const handleDeletePlan = (planId: string) => {
    if (confirm('Etes-vous sur de vouloir supprimer ce plan ?')) {
      deletePlanMutation.mutate(planId)
    }
  }

  const renderContent = () => {
    if (status === 'loading') {
      return <div>Chargement de l utilisateur...</div>
    }

    if (status === 'unauthenticated') {
      return <div className="text-red-500 font-medium">Acces refuse. Vous devez etre connecte.</div>
    }

    if (!gymId) {
      return <div className="text-red-500 font-medium">Aucun gymnase associe a votre compte.</div>
    }

    if (plansLoading || variantsLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-9 w-52" />
          <div className="rounded-3xl border border-border/70 bg-card p-6 space-y-4">
            <Skeleton className="h-6 w-2/5" />
            <Skeleton className="h-4 w-3/5" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      )
    }

    return (
      <>
        <div className="flex justify-end">
          <VariantSelector
            variants={variants}
            value={selectedVariant}
            onChange={setSelectedVariant}
            isGymAdmin={isGymAdmin}
            lockedVariantId={lockedVariantId}
            loading={variantsLoading}
          />
        </div>
        <Card className="border border-border/70 bg-card">
          <CardHeader className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <CardTitle>Plans d abonnement</CardTitle>
              <CardDescription>Controlez les offres proposees a vos membres.</CardDescription>
            </div>
            <div className="inline-flex gap-4 text-sm text-muted-foreground">
              <span>
                <span className="font-semibold text-foreground">{planStats.active}</span> actifs
              </span>
              <span>
                <span className="font-semibold text-foreground">{planStats.inactive}</span> inactifs
              </span>
              <span>
                <span className="font-semibold text-foreground">{planStats.total}</span> plans
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Ajustez la duree, le prix et le statut de vos plans pour rester aligne avec vos objectifs.
            </p>
            <Button onClick={handleAddPlan}>
              <Plus className="mr-2 h-4 w-4" />
              Ajouter un plan
            </Button>
          </CardContent>
        </Card>

        {planLimits ? (
          <div
            className={`rounded-2xl border px-4 py-3 ${
              capBlocked
                ? 'border-destructive/60 bg-destructive/5'
                : capWarning
                  ? 'border-amber-300/60 bg-amber-50'
                  : 'border-border/70 bg-muted/40'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Limites plans</p>
                <p className="text-xs text-muted-foreground">
                  Limites actives selon votre formule. Desactivez un plan pour liberer un slot.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="outline" className="border-border/70 bg-background/60">
                  Variante: {activeVariantCount}/{formatLimitLabel(variantLimit, planLimits.unlimitedPerVariant)}
                </Badge>
                <Badge variant="outline" className="border-border/70 bg-background/60">
                  Reseau: {activePlans.length}/{formatLimitLabel(networkLimit, planLimits.unlimitedPerNetwork)}
                </Badge>
              </div>
            </div>
            {capBlocked ? (
              <p className="mt-2 text-xs font-semibold text-destructive">
                Limite atteinte: desactivez un plan actif ou passez au plan superieur pour augmenter le catalogue.
              </p>
            ) : capWarning ? (
              <p className="mt-2 text-xs font-medium text-amber-800">Dernier plan actif disponible sur ce perimetre.</p>
            ) : null}
          </div>
        ) : null}

        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-md sm:max-w-lg w-[95vw]">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Modifier le plan' : 'Ajouter un plan'}</DialogTitle>
            </DialogHeader>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="space-y-4">
              <div>
                <Label htmlFor="plan-variant">Variante</Label>
                {isGymAdmin ? (
                  <p className="text-sm text-muted-foreground">
                    {variants.find((variant) => variant.id === lockedVariantId)?.name ?? 'Variante assignee'}
                  </p>
                ) : (
                  <Select value={effectivePlanVariantId} onValueChange={(value) => setPlanVariantId(value)}>
                    <SelectTrigger id="plan-variant">
                      <SelectValue placeholder="Choisir une variante" />
                    </SelectTrigger>
                    <SelectContent>
                      {(variants ?? []).map((variant) => (
                        <SelectItem key={variant.id} value={variant.id}>
                          {variant.name} {variant.isDefault ? '(par defaut)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div>
                <Label htmlFor="plan-name">Nom du plan</Label>
                <Input
                  id="plan-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Mensuel"
                />
              </div>

              <div>
                <Label htmlFor="plan-duration">Duree en jours</Label>
                <Input
                  id="plan-duration"
                  type="number"
                  value={formData.durationDays}
                  onChange={(e) => setFormData({ ...formData, durationDays: e.target.value })}
                  placeholder="30"
                />
              </div>

              <div>
                <Label htmlFor="plan-price">Prix (MAD)</Label>
                <Input
                  id="plan-price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="300"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="plan-visits">Visites par jour</Label>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="plan-visits-unlimited"
                      checked={formData.unlimitedVisits}
                      onCheckedChange={(checked) =>
                        setFormData((prev) => ({
                          ...prev,
                          unlimitedVisits: checked,
                          visitsPerDay: checked ? '' : prev.visitsPerDay || '1',
                        }))
                      }
                    />
                    <Label htmlFor="plan-visits-unlimited" className="text-sm text-muted-foreground">
                      Illimite
                    </Label>
                  </div>
                </div>
                <Input
                  id="plan-visits"
                  type="number"
                  min={1}
                  disabled={formData.unlimitedVisits}
                  value={formData.unlimitedVisits ? '' : formData.visitsPerDay}
                  onChange={(e) => setFormData({ ...formData, visitsPerDay: e.target.value })}
                  placeholder="1"
                />
                <p className="text-xs text-muted-foreground">
                  Limitez les passages quotidiens ou activez le mode illimite.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="plan-session-limit">Duree max par session (minutes)</Label>
                  <span className="text-xs text-muted-foreground">
                    {selectedVariantLimit ? `Variante: ${selectedVariantLimit} min` : 'Suit la limite globale'}
                  </span>
                </div>
                <Input
                  id="plan-session-limit"
                  type="number"
                  min={1}
                  value={formData.maxSessionMinutes}
                  onChange={(e) => setFormData({ ...formData, maxSessionMinutes: e.target.value })}
                  placeholder={selectedVariantLimit ? String(selectedVariantLimit) : 'Herite du variant'}
                />
                <p className="text-xs text-muted-foreground">
                  Laissez vide pour utiliser la valeur de la variante ou du gymnase.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="plan-active" className="text-sm font-medium">
                  Actif
                </Label>
                <Switch
                  id="plan-active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
              </div>

              <Button onClick={handleSubmit} className="w-full" disabled={savePlanMutation.isPending}>
                {savePlanMutation.isPending
                  ? 'Enregistrement...'
                  : editingId
                    ? 'Mettre a jour'
                    : 'Creer'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {isError ? (
          <div className="rounded-3xl border border-destructive/40 bg-destructive/5 p-6 text-destructive">
            Impossible de charger les plans.
          </div>
        ) : (
          <div className="rounded-3xl border border-border/70 bg-card">
            {planPagination.data.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-6 py-4 text-sm text-muted-foreground">
                <span>
                  {plans.length} plan{plans.length > 1 ? 's' : ''} trouve{plans.length > 1 ? 's' : ''}
                </span>
                <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Page {planPagination.page} / {planPagination.pageCount}
                </span>
              </div>
            )}
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 text-muted-foreground">
                  <TableHead>Nom du plan</TableHead>
                  <TableHead>Duree (jours)</TableHead>
                  <TableHead>Prix (MAD)</TableHead>
                  <TableHead>Visites/jour</TableHead>
                  <TableHead>Session max (min)</TableHead>
                  <TableHead>Actif</TableHead>
                  <TableHead>Variante</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {planPagination.data.map((plan) => (
                  <TableRow key={plan.id} className="border-border/60">
                    <TableCell className="font-medium">{plan.name}</TableCell>
                    <TableCell>{plan.durationDays}</TableCell>
                    <TableCell>{plan.price.toLocaleString('fr-FR')}</TableCell>
                    <TableCell>{plan.visitsPerDay < 0 ? 'Illimite' : plan.visitsPerDay}</TableCell>
                    <TableCell>
                      {plan.maxSessionMinutes ? `${plan.maxSessionMinutes} min` : (
                        <span className="text-xs text-muted-foreground">Variante/gym</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                        {plan.isActive ? 'Oui' : 'Non'}
                      </Badge>
                    </TableCell>
                    <TableCell>{plan.gymVariant?.name ?? '-'}</TableCell>

                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => handleEditPlan(plan)}>
                            <Edit2 className="mr-2" size={16} />
                            Modifier
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onSelect={() => handleDeletePlan(plan.id)}
                            className="text-destructive"
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
                page={planPagination.page}
                pageCount={planPagination.pageCount}
                pageSize={planPagination.pageSize}
                onPageChange={planPagination.setPage}
                totalItems={plans.length}
              />
            </div>
          </div>
        )}
      </>
    )
  }

  return <div className="space-y-6">{renderContent()}</div>
}
