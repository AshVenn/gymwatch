'use client'

import { useSession } from 'next-auth/react'
import { useMemo, useState } from 'react'
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
import { MoreVertical, Plus, Edit2, Trash2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { PaginationControls, usePagination } from '@/components/dashboard/pagination-controls'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface Plan {
  id: string
  name: string
  durationDays: number
  price: number
  isActive: boolean
}

export default function PlansPage() {
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    durationDays: '',
    price: '',
    isActive: true,
  })
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status === 'loading') {
    return <div>Chargement de l'utilisateur...</div>
  }

  if (status === 'unauthenticated') {
    return <div className="text-red-500 font-medium">Accès refusé. Vous devez être connecté.</div>
  }

  if (!session?.user?.gymId) {
    return <div className="text-red-500 font-medium">Aucun gymnase associé à votre compte.</div>
  }

  const planQueryKey = useMemo(() => ['plans', session.user.gymId] as const, [session.user.gymId])

  const { data: plans = [], isError } = useQuery<Plan[]>({
    queryKey: planQueryKey,
    enabled: status === 'authenticated',
    queryFn: async () => {
      const response = await fetch('/api/plans')

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Non autorisé. Votre session a peut-être expiré.')
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
    setFormData({ name: '', durationDays: '', price: '', isActive: true })
    setIsOpen(true)
  }

  const handleEditPlan = (plan: Plan) => {
    setEditingId(plan.id)
    setFormData({
      name: plan.name,
      durationDays: String(plan.durationDays),
      price: String(plan.price),
      isActive: plan.isActive,
    })
    setIsOpen(true)
  }

  const savePlanMutation = useMutation({
    mutationFn: async () => {
      const method = editingId ? 'PUT' : 'POST'
      const url = editingId ? `/api/plans/${editingId}` : '/api/plans'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          durationDays: parseInt(formData.durationDays),
          price: parseFloat(formData.price),
          isActive: formData.isActive,
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
      setFormData({ name: '', durationDays: '', price: '', isActive: true })
      setEditingId(null)
      queryClient.invalidateQueries({ queryKey: planQueryKey })
      toast.success(editingId ? 'Plan mis à jour avec succès' : 'Plan créé avec succès')
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
      toast.success('Plan supprimé avec succès')
    },
    onError: (err) => {
      const message = err instanceof Error ? err.message : 'Erreur lors de la suppression.'
      setError(message)
      toast.error(message)
    },
  })

  const handleSubmit = () => {
    savePlanMutation.mutate()
  }

  const handleDeletePlan = (planId: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce plan ?')) {
      deletePlanMutation.mutate(planId)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border border-border/70 bg-card">
        <CardHeader className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <CardTitle>Plans d'abonnement</CardTitle>
            <CardDescription>Contrôlez les offres proposées à vos membres.</CardDescription>
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
            Ajustez la durée, le prix et le statut de vos plans pour rester aligné avec vos objectifs.
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
              <Label htmlFor="plan-name">Nom du plan</Label>
              <Input
                id="plan-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Mensuel"
              />
            </div>

            <div>
              <Label htmlFor="plan-duration">Durée en jours</Label>
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
                  ? 'Mettre à jour'
                  : 'Créer'}
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
                {plans.length} plan{plans.length > 1 ? 's' : ''} trouvé{plans.length > 1 ? 's' : ''}
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
                <TableHead>Durée (jours)</TableHead>
                <TableHead>Prix (MAD)</TableHead>
                <TableHead>Actif</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {planPagination.data.map((plan) => (
                <TableRow key={plan.id} className="border-border/60">
                  <TableCell className="font-medium">{plan.name}</TableCell>
                  <TableCell>{plan.durationDays}</TableCell>
                  <TableCell>{plan.price.toLocaleString('fr-FR')}</TableCell>
                  <TableCell>
                    <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                      {plan.isActive ? 'Oui' : 'Non'}
                    </Badge>
                  </TableCell>

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
    </div>
  )
}
