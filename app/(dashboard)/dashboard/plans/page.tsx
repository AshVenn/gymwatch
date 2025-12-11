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
  gymVariantId?: string
  gymVariant?: { id: string; name: string; slug: string; isDefault?: boolean }
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

  const [planVariantId, setPlanVariantId] = useState<string>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    durationDays: '',
    price: '',
    isActive: true,
    visitsPerDay: '',
    unlimitedVisits: false,
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

  const handleAddPlan = () => {
    setEditingId(null)
    setFormData({ name: '', durationDays: '', price: '', isActive: true, visitsPerDay: '1', unlimitedVisits: false })
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
    })
    setPlanVariantId(plan.gymVariantId ?? plan.gymVariant?.id ?? lockedVariantId ?? '')
    setIsOpen(true)
  }

  const savePlanMutation = useMutation({
    mutationFn: async (visitsPerDayValue: number) => {
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
          visitsPerDay: visitsPerDayValue,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la sauvegarde')
      }

      return data
    },
    onSuccess: () => {
      setError(null)
      setIsOpen(false)
      setFormData({ name: '', durationDays: '', price: '', isActive: true, visitsPerDay: '1', unlimitedVisits: false })
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
    savePlanMutation.mutate(parsedVisits)
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
